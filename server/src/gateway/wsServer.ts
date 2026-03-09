import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AgentBridge } from '../agents/AgentBridge.js';
import { LLMAgent } from '../agents/LLMAgent.js';
import { MessageService } from '../services/MessageService.js';
import { ConfigService } from '../services/ConfigService.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { SessionService } from '../services/SessionService.js';
import type { WSClientMessage, WSServerMessage } from '../types/index.js';

const SUMMARY_DIR = path.join(os.homedir(), '.workagent', 'summaries');
fs.mkdirSync(SUMMARY_DIR, { recursive: true });

export function createWebSocketServer(server: Server, agentBridge: AgentBridge): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const messageService = new MessageService();
  const configService = new ConfigService();
  const workspaceService = new WorkspaceService();
  const sessionService = new SessionService();

  const clientSessions = new Map<WebSocket, Set<string>>();

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    clientSessions.set(ws, new Set());

    const send = (msg: WSServerMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    send({ type: 'connected', payload: { message: 'Connected to WorkAgent Gateway' } });

    ws.on('message', async (raw) => {
      let msg: WSClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        console.error('[WS] Failed to parse message:', raw.toString().slice(0, 200));
        send({ type: 'error', payload: { code: 'PARSE_ERROR', message: 'Invalid message format' } });
        return;
      }

      console.log(`[WS] Received: ${msg.type}`, msg.type === 'chat.send' ? `(session ${msg.payload.sessionId})` : '');

      try {
        switch (msg.type) {
          case 'session.subscribe': {
            clientSessions.get(ws)?.add(msg.payload.sessionId);
            console.log(`[WS] Client subscribed to session ${msg.payload.sessionId}`);
            break;
          }

          case 'chat.cancel': {
            agentBridge.cancel(msg.payload.sessionId);
            send({
              type: 'agent.status',
              payload: { sessionId: msg.payload.sessionId, status: 'idle', detail: 'Cancelled' },
            });
            break;
          }

          case 'chat.send': {
            const { sessionId, content } = msg.payload;

            const session = sessionService.getById(sessionId);
            if (!session) {
              console.log(`[WS] Session not found: ${sessionId}`);
              send({ type: 'error', payload: { code: 'SESSION_NOT_FOUND', message: 'Session not found', sessionId } });
              break;
            }

            const workspace = workspaceService.getById(session.workspaceId);
            if (!workspace) {
              console.log(`[WS] Workspace not found for session: ${sessionId}`);
              send({ type: 'error', payload: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found', sessionId } });
              break;
            }

            console.log(`[WS] Processing message in workspace: ${workspace.path}`);

            messageService.create(sessionId, 'user', content);
            send({ type: 'agent.status', payload: { sessionId, status: 'thinking' } });

            const config = configService.resolveConfig(workspace.path);
            const history = messageService.getRecentContext(sessionId, 20);
            const workDir = session.workingDirectory || config.settings.workingDirectory as string | undefined;

            const messageId = uuid();
            let fullContent = '';
            const startTime = Date.now();

            const agentName = agentBridge.getDefaultName();
            send({ type: 'agent.status', payload: { sessionId, status: 'executing', detail: `Agent: ${agentName}` } });
            console.log(`[WS] Working directory: ${workDir || '(not set)'}`);

            interface ToolRecord { id: string; name: string; args: string; result?: string; }
            const toolRecords: ToolRecord[] = [];

            try {
              let chunkCount = 0;
              for await (const chunk of agentBridge.execute(content, {
                sessionId,
                workspacePath: workspace.path,
                skills: config.skills,
                soul: config.soul,
                agent: config.agent,
                identity: config.identity,
                memory: config.memory,
                user: config.user,
                history,
                workingDirectory: workDir,
              })) {
                chunkCount++;
                if (chunkCount === 1) {
                  console.log(`[WS] First chunk from ${agentName}: type=${chunk.type}, len=${chunk.content?.length || 0}`);
                }
                if (chunk.type === 'text' && chunk.content) {
                  fullContent += chunk.content;
                  send({
                    type: 'chat.stream',
                    payload: { sessionId, delta: chunk.content, messageId },
                  });
                } else if (chunk.type === 'tool_call') {
                  const meta = chunk.metadata || {};
                  const toolId = meta.toolCallId as string || `t-${Date.now()}`;
                  toolRecords.push({ id: toolId, name: meta.toolName as string, args: meta.arguments as string || '{}' });
                  send({
                    type: 'chat.tool_call',
                    payload: {
                      sessionId,
                      messageId,
                      toolCallId: toolId,
                      toolName: meta.toolName as string,
                      arguments: meta.arguments as string,
                      status: meta.status as string,
                    },
                  });
                } else if (chunk.type === 'tool_result') {
                  const meta = chunk.metadata || {};
                  const toolId = meta.toolCallId as string;
                  const rec = toolRecords.find(r => r.id === toolId);
                  if (rec) rec.result = chunk.content;
                  send({
                    type: 'chat.tool_result',
                    payload: {
                      sessionId,
                      messageId,
                      toolCallId: toolId,
                      toolName: meta.toolName as string,
                      result: chunk.content,
                    },
                  });
                } else if (chunk.type === 'trace') {
                  const span = chunk.metadata?.span;
                  if (span) {
                    send({ type: 'trace.span', payload: { sessionId, messageId, span: span as any } });
                  }
                } else if (chunk.type === 'error') {
                  const errText = `⚠️ ${chunk.content}`;
                  fullContent += errText;
                  send({
                    type: 'chat.stream',
                    payload: { sessionId, delta: errText, messageId },
                  });
                }
              }

              if (fullContent) {
                messageService.create(sessionId, 'assistant', fullContent);
                if (session.title === 'New Chat' && content.length > 0) {
                  const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
                  sessionService.update(sessionId, { title });
                }
              }

              let summaryFileId: string | undefined;
              if (fullContent.length > 300 || toolRecords.length > 0) {
                try {
                  summaryFileId = writeSummaryFile(
                    sessionId, messageId, agentName, content, fullContent, toolRecords, workspace.path, workDir
                  );
                } catch (e: any) {
                  console.error('[WS] Failed to write summary:', e.message);
                }
              }

              const elapsed = Date.now() - startTime;
              const llmConfig = LLMAgent.loadConfig();

              const workflowMeta: Record<string, unknown> = {
                agent: agentName,
                summaryFileId,
                timestamp: new Date().toISOString(),
                durationMs: elapsed,
                workspace: workspace.path,
                workingDirectory: workDir || null,
                historyMessages: history.length,
                toolCallCount: toolRecords.length,
                toolNames: toolRecords.map(t => t.name),
                responseLength: fullContent.length,
                configs: {
                  agent: config.agent ? { loaded: true, length: config.agent.length } : { loaded: false },
                  skill: config.skills ? { loaded: true, length: config.skills.length } : { loaded: false },
                  identity: config.identity ? { loaded: true, length: config.identity.length } : { loaded: false },
                  memory: config.memory ? { loaded: true, length: config.memory.length } : { loaded: false },
                  user: config.user ? { loaded: true, length: config.user.length } : { loaded: false },
                  soul: config.soul ? { loaded: true, length: config.soul.length } : { loaded: false },
                },
                llm: llmConfig ? {
                  provider: llmConfig.provider,
                  model: llmConfig.model,
                  baseUrl: llmConfig.baseUrl,
                  maxTokens: llmConfig.maxTokens,
                  temperature: llmConfig.temperature,
                } : null,
              };

              send({
                type: 'chat.complete',
                payload: {
                  sessionId,
                  messageId,
                  content: fullContent,
                  metadata: workflowMeta,
                },
              });
              console.log(`[WS] Response complete (agent: ${agentName}, chunks: ${chunkCount}, chars: ${fullContent.length}, tools: ${toolRecords.length}, ${elapsed}ms)`);
            } catch (error: any) {
              console.error('[WS] Execution error:', error.message);
              send({
                type: 'error',
                payload: { code: 'EXECUTION_ERROR', message: error.message, sessionId },
              });
            }

            send({ type: 'agent.status', payload: { sessionId, status: 'idle' } });
            break;
          }
        }
      } catch (error: any) {
        console.error('[WS] Handler error:', error);
        send({ type: 'error', payload: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      clientSessions.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err.message);
    });
  });

  return wss;
}

function writeSummaryFile(
  sessionId: string,
  messageId: string,
  agentName: string,
  userPrompt: string,
  response: string,
  tools: { id: string; name: string; args: string; result?: string }[],
  workspacePath: string,
  workDir?: string,
): string {
  const ts = new Date().toISOString();
  const fileId = `${sessionId.slice(0, 8)}-${Date.now()}`;
  const filename = `${fileId}.md`;
  const filePath = path.join(SUMMARY_DIR, filename);

  const lines: string[] = [];
  lines.push(`# Task Summary`);
  lines.push('');
  lines.push(`**Agent:** ${agentName}  `);
  lines.push(`**Workspace:** ${workspacePath}  `);
  if (workDir) lines.push(`**Working Directory:** ${workDir}  `);
  lines.push(`**Timestamp:** ${ts}  `);
  lines.push(`**Session:** ${sessionId}  `);
  lines.push(`**Message:** ${messageId}  `);
  lines.push('');
  lines.push('## User Request');
  lines.push('');
  lines.push(userPrompt);
  lines.push('');

  if (tools.length > 0) {
    lines.push('## Tool Calls');
    lines.push('');
    for (const t of tools) {
      lines.push(`### ${t.name}`);
      lines.push('');
      lines.push('**Arguments:**');
      lines.push('```json');
      try { lines.push(JSON.stringify(JSON.parse(t.args), null, 2)); } catch { lines.push(t.args); }
      lines.push('```');
      if (t.result) {
        lines.push('');
        lines.push('**Result:**');
        lines.push('```');
        lines.push(t.result.length > 5000 ? t.result.slice(0, 5000) + '\n... (truncated)' : t.result);
        lines.push('```');
      }
      lines.push('');
    }
  }

  lines.push('## Response');
  lines.push('');
  lines.push(response);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`[WS] Summary written: ${filePath}`);
  return fileId;
}
