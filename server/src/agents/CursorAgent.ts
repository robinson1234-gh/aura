import { type ChildProcess, execSync } from 'child_process';
import { BaseAgent } from './BaseAgent.js';
import type { AgentContext, StreamChunk } from '../types/index.js';
import { spawnSafe } from '../tools/spawnSafe.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface CursorConfig {
  apiKey: string;
}

const CONFIG_PATH = path.join(os.homedir(), '.workagent', 'cursor-config.json');

function resolveAgentBinary(): string {
  const localBin = path.join(os.homedir(), '.local', 'bin', 'agent');
  if (fs.existsSync(localBin)) return localBin;

  try {
    const which = execSync('which agent 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (which) return which;
  } catch { /* not on PATH */ }

  return 'agent';
}

export class CursorAgent extends BaseAgent {
  name = 'cursor';
  description = 'Executes tasks via Cursor Agent CLI (the `agent` command)';

  private activeProcesses = new Map<string, ChildProcess>();
  private readonly TIMEOUT_MS = 30 * 60 * 1000;

  static loadConfig(): CursorConfig | null {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      }
    } catch { /* ignore */ }
    return null;
  }

  static saveConfig(config: CursorConfig): void {
    const dir = path.dirname(CONFIG_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  }

  private getApiKey(): string | null {
    if (process.env.CURSOR_API_KEY) return process.env.CURSOR_API_KEY;
    const config = CursorAgent.loadConfig();
    return config?.apiKey || null;
  }

  async *execute(prompt: string, context: AgentContext): AsyncGenerator<StreamChunk> {
    const fullPrompt = this.buildPrompt(prompt, context);

    const available = await this.healthCheck();
    if (!available) {
      yield { type: 'error', content: 'Cursor Agent CLI not available. Either the CLI is not installed or authentication is not configured. Open Settings > Agents for setup instructions.' };
      yield { type: 'done', content: '' };
      return;
    }

    try {
      yield* this.runAgent(fullPrompt, context);
    } catch (error: any) {
      yield { type: 'error', content: `Agent error: ${error.message}` };
    } finally {
      this.activeProcesses.delete(context.sessionId);
      yield { type: 'done', content: '' };
    }
  }

  cancel(sessionId: string): void {
    const proc = this.activeProcesses.get(sessionId);
    if (proc) {
      proc.kill('SIGTERM');
      this.activeProcesses.delete(sessionId);
    }
  }

  override async healthCheck(): Promise<boolean> {
    const cliExists = await this.checkCliExists();
    if (!cliExists) return false;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      const loggedIn = await this.checkCliAuth();
      return loggedIn;
    }
    return true;
  }

  private checkCliExists(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proc = spawnSafe(resolveAgentBinary(), ['--version'], { shell: true, stdio: 'pipe' });
        let output = '';
        proc.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
        const timer = setTimeout(() => { proc.kill(); resolve(false); }, 10000);
        proc.on('close', (code) => { clearTimeout(timer); resolve(code === 0 && output.trim().length > 0); });
        proc.on('error', () => { clearTimeout(timer); resolve(false); });
      } catch { resolve(false); }
    });
  }

  private checkCliAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proc = spawnSafe(resolveAgentBinary(), ['status'], { shell: true, stdio: 'pipe' });
        let output = '';
        proc.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
        proc.stderr?.on('data', (d: Buffer) => { output += d.toString(); });
        const timer = setTimeout(() => { proc.kill(); resolve(false); }, 15000);
        proc.on('close', () => {
          clearTimeout(timer);
          const clean = output.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '').toLowerCase();
          resolve(!clean.includes('not logged in') && !clean.includes('authentication required'));
        });
        proc.on('error', () => { clearTimeout(timer); resolve(false); });
      } catch { resolve(false); }
    });
  }

  private async *runAgent(prompt: string, context: AgentContext): AsyncGenerator<StreamChunk> {
    const apiKey = this.getApiKey();
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--stream-partial-output',
      '--force',
      '--trust',
      '--', prompt,
    ];

    if (apiKey) {
      args.push('--api-key', apiKey);
    }

    if (context.workingDirectory) {
      args.push('--workspace', context.workingDirectory);
    }

    console.log(`[CursorAgent] Spawning agent (workspace: ${context.workingDirectory || 'cwd'}, apiKey: ${apiKey ? 'set' : 'not set'})`);

    const env = { ...process.env };
    if (apiKey) env.CURSOR_API_KEY = apiKey;

    const proc = spawnSafe(resolveAgentBinary(), args, {
      cwd: context.workingDirectory || undefined,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.activeProcesses.set(context.sessionId, proc);

    const timeout = setTimeout(() => {
      console.log('[CursorAgent] Timeout reached, killing process');
      proc.kill('SIGTERM');
    }, this.TIMEOUT_MS);

    let buffer = '';
    let stderrOutput = '';

    proc.stderr?.on('data', (d: Buffer) => {
      const text = d.toString();
      stderrOutput += text;
      console.log(`[CursorAgent] stderr: ${text.trim().slice(0, 200)}`);
    });

    let lineCount = 0;
    try {
      for await (const chunk of proc.stdout!) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          lineCount++;
          if (lineCount <= 5) {
            console.log(`[CursorAgent] stdout line ${lineCount}: ${line.slice(0, 300)}`);
          }
          for (const chunk of this.parseLines(line)) {
            yield chunk;
          }
        }
      }

      if (buffer.trim()) {
        for (const chunk of this.parseLines(buffer)) {
          yield chunk;
        }
      }

      console.log(`[CursorAgent] Process finished (lines: ${lineCount}, stderr: ${stderrOutput.length} chars)`);

      if (stderrOutput && lineCount === 0) {
        yield { type: 'error', content: stderrOutput };
      }
    } finally {
      clearTimeout(timeout);
      if (!proc.killed) proc.kill();
    }
  }

  private activeToolId: string | null = null;
  private activeToolName: string | null = null;
  private activeToolInput = '';

  private parseLines(line: string): StreamChunk[] {
    try {
      const data = JSON.parse(line);
      return this.parseEvent(data);
    } catch {
      if (line.trim()) return [{ type: 'text', content: line }];
      return [];
    }
  }

  private parseEvent(data: any): StreamChunk[] {
    const results: StreamChunk[] = [];
    const t = data.type;

    // --- Text streaming ---
    if (t === 'message_delta' || t === 'content_block_delta') {
      const text = data.payload?.text || data.delta?.text || '';
      if (text) results.push({ type: 'text', content: text });
      return results;
    }

    if (t === 'message_complete' || t === 'message_stop') {
      return results;
    }

    // --- Tool lifecycle: BEGIN ---
    if (t === 'tool_use_begin' || t === 'tool_call' || t === 'tool_use' || t === 'content_block_start') {
      const payload = data.payload || data.content_block || data;
      const toolName = payload.name || data.tool_name || data.name || 'unknown_tool';
      const toolId = payload.id || data.tool_call_id || data.id || `cursor-tool-${Date.now()}`;
      const input = payload.input;
      const args = input ? (typeof input === 'string' ? input : JSON.stringify(input)) : '{}';

      this.activeToolId = toolId;
      this.activeToolName = toolName;
      this.activeToolInput = args !== '{}' ? args : '';

      results.push({
        type: 'tool_call',
        content: `Using tool: ${toolName}`,
        metadata: {
          toolCallId: toolId,
          toolName,
          arguments: args,
          status: 'running',
        },
      });
      return results;
    }

    // --- Tool lifecycle: DELTA (partial input streaming) ---
    if (t === 'tool_use_delta' || t === 'input_json_delta') {
      const partial = data.payload?.input_delta || data.delta?.partial_json || data.delta || '';
      if (partial && this.activeToolId) {
        this.activeToolInput += typeof partial === 'string' ? partial : JSON.stringify(partial);
        results.push({
          type: 'tool_call',
          content: `Streaming input for: ${this.activeToolName}`,
          metadata: {
            toolCallId: this.activeToolId,
            toolName: this.activeToolName || 'tool',
            arguments: this.activeToolInput,
            status: 'running',
          },
        });
      }
      return results;
    }

    // --- Tool lifecycle: END / RESULT ---
    if (t === 'tool_result' || t === 'tool_use_end' || t === 'content_block_stop') {
      const toolId = data.payload?.id || data.tool_call_id || data.id || this.activeToolId || '';
      const toolName = data.payload?.name || data.tool_name || data.name || this.activeToolName || 'tool';

      const rawOutput = data.payload?.output ?? data.payload?.content ?? data.content ?? data.result;
      let output: string;
      if (rawOutput !== undefined && rawOutput !== null) {
        output = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput, null, 2);
      } else if (t === 'content_block_stop' && this.activeToolId) {
        output = `Tool ${this.activeToolName} completed`;
      } else {
        output = JSON.stringify(data.payload || data);
      }

      results.push({
        type: 'tool_result',
        content: output,
        metadata: {
          toolCallId: toolId,
          toolName,
        },
      });

      this.activeToolId = null;
      this.activeToolName = null;
      this.activeToolInput = '';
      return results;
    }

    // --- Error ---
    if (t === 'error') {
      results.push({
        type: 'error',
        content: data.content || data.message || data.error?.message || data.payload?.message || 'Unknown error',
      });
      return results;
    }

    // --- Other text-like events ---
    if (t === 'text' || t === 'content') {
      const text = data.content || data.text || '';
      if (text) results.push({ type: 'text', content: text });
      return results;
    }

    // --- Catch-all: log unknown events and try to extract useful content ---
    console.log(`[CursorAgent] Unknown event type="${t}": ${JSON.stringify(data).slice(0, 500)}`);
    const textContent = data.content || data.text || data.payload?.text || data.payload?.content;
    if (textContent) {
      results.push({ type: 'text', content: textContent });
    }

    return results;
  }
}
