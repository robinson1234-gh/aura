import { BaseAgent } from './BaseAgent.js';
import type { AgentContext, StreamChunk } from '../types/index.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { CursorTool } from '../tools/CursorTool.js';
import { ShellTool } from '../tools/ShellTool.js';
import { ReadFileTool, WriteFileTool, ListDirectoryTool, SearchFilesTool } from '../tools/FileTool.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface LLMConfig {
  provider: 'qwen' | 'openai' | 'anthropic' | 'deepseek' | 'openrouter' | 'custom';
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

const CONFIG_PATH = path.join(os.homedir(), '.workagent', 'llm-config.json');

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  qwen:       { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-coder-plus-latest' },
  openai:     { baseUrl: 'https://api.openai.com/v1',           model: 'gpt-4o' },
  anthropic:  { baseUrl: 'https://api.anthropic.com/v1',        model: 'claude-sonnet-4-20250514' },
  deepseek:   { baseUrl: 'https://api.deepseek.com/v1',        model: 'deepseek-chat' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1',       model: 'anthropic/claude-sonnet-4-20250514' },
  custom:     { baseUrl: 'http://localhost:11434/v1',           model: 'llama3' },
};

const MAX_TOOL_ITERATIONS = 10;

type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls: ToolCallMessage[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface ToolCallMessage {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export class LLMAgent extends BaseAgent {
  name = 'llm';
  description = 'LLM Orchestrator — chats with an LLM that can invoke tools (Cursor Agent, shell, file ops) to complete tasks';

  private abortControllers = new Map<string, AbortController>();
  private toolRegistry: ToolRegistry;

  constructor() {
    super();
    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.register(new CursorTool());
    this.toolRegistry.register(new ShellTool());
    this.toolRegistry.register(new ReadFileTool());
    this.toolRegistry.register(new WriteFileTool());
    this.toolRegistry.register(new ListDirectoryTool());
    this.toolRegistry.register(new SearchFilesTool());
  }

  static loadConfig(): LLMConfig | null {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch { /* ignore */ }
    return null;
  }

  static saveConfig(config: LLMConfig): void {
    const dir = path.dirname(CONFIG_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  }

  static getConfigPath(): string {
    return CONFIG_PATH;
  }

  private getConfig(): LLMConfig | null {
    return LLMAgent.loadConfig();
  }

  override async healthCheck(): Promise<boolean> {
    const config = this.getConfig();
    if (!config || !config.apiKey || config.apiKey.length < 5) return false;
    if (config.apiKey === '(unchanged)') return false;
    return true;
  }

  cancel(sessionId: string): void {
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(sessionId);
    }
  }

  async *execute(prompt: string, context: AgentContext): AsyncGenerator<StreamChunk> {
    const config = this.getConfig();
    if (!config || !config.apiKey) {
      yield { type: 'error', content: 'LLM agent not configured. Go to Settings (gear icon) or call `PUT /api/llm/config` to set your API key and provider.' };
      yield { type: 'done', content: '' };
      return;
    }

    try {
      if (config.provider === 'anthropic') {
        yield* this.executeAnthropic(prompt, context, config);
      } else {
        yield* this.executeOpenAICompatible(prompt, context, config);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        yield { type: 'text', content: '\n\n*[Cancelled]*' };
      } else {
        yield { type: 'error', content: `LLM error: ${error.message}` };
      }
    } finally {
      this.abortControllers.delete(context.sessionId);
      yield { type: 'done', content: '' };
    }
  }

  private buildMessages(prompt: string, context: AgentContext): ChatMessage[] {
    const messages: ChatMessage[] = [];

    const systemParts: string[] = [
      'You are a helpful AI assistant that can use tools to complete tasks.',
      'When the user asks you to perform actions (coding, file operations, running commands, etc.), use the available tools.',
      'Always explain what you\'re doing and share the results.',
    ];
    if (context.soul) systemParts.push('\n--- Persona ---\n' + context.soul);
    if (context.skills) systemParts.push('\n--- Skills ---\n' + context.skills);
    if (context.workingDirectory) {
      systemParts.push(`\nCurrent working directory: ${context.workingDirectory}`);
    }
    messages.push({ role: 'system', content: systemParts.join('\n') });

    for (const msg of context.history) {
      if (msg.role === 'system') continue;
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: prompt });
    return messages;
  }

  private async *executeOpenAICompatible(prompt: string, context: AgentContext, config: LLMConfig): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    this.abortControllers.set(context.sessionId, controller);

    const messages: ChatMessage[] = this.buildMessages(prompt, context);
    const tools = this.toolRegistry.getDefinitions();
    const url = `${config.baseUrl}/chat/completions`;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const requestBody: Record<string, unknown> = {
        model: config.model,
        messages,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        stream: true,
      };
      if (tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }

      console.log(`[LLMAgent] Calling ${url} (model: ${config.model}, iteration: ${iteration}, tools: ${tools.length})`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLMAgent] API error ${response.status}: ${errorText.slice(0, 300)}`);
        throw new Error(`API returned ${response.status}: ${errorText.slice(0, 500)}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const { textContent, toolCalls, finishReason } = await this.readSSEStream(response, controller);

      if (!textContent && toolCalls.length === 0) {
        console.error(`[LLMAgent] Empty response from API (finish_reason: ${finishReason}, url: ${url}, model: ${config.model})`);
        yield { type: 'error', content: `LLM returned empty response. Check your API key and model configuration.\n\nProvider: ${config.provider}\nModel: ${config.model}\nBase URL: ${config.baseUrl}` };
        break;
      }

      if (textContent) {
        yield { type: 'text', content: textContent };
      }

      if (toolCalls.length > 0 && (finishReason === 'tool_calls' || finishReason === 'stop' || finishReason === null)) {
        messages.push({
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCalls,
        });

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = toolCall.function.arguments;

          yield {
            type: 'tool_call',
            content: `Calling tool: **${toolName}**`,
            metadata: {
              toolCallId: toolCall.id,
              toolName,
              arguments: toolArgs,
              status: 'running',
            },
          };

          const result = await this.toolRegistry.execute(toolName, toolArgs, context);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });

          yield {
            type: 'tool_result',
            content: result,
            metadata: {
              toolCallId: toolCall.id,
              toolName,
              status: 'completed',
            },
          };
        }

        continue;
      }

      break;
    }
  }

  private async readSSEStream(
    response: Response,
    _controller: AbortController
  ): Promise<{ textContent: string; toolCalls: ToolCallMessage[]; finishReason: string | null }> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let textContent = '';
    let finishReason: string | null = null;

    const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          const toolCalls: ToolCallMessage[] = [];
          for (const acc of toolCallAccumulators.values()) {
            toolCalls.push({
              id: acc.id,
              type: 'function',
              function: { name: acc.name, arguments: acc.arguments },
            });
          }
          return { textContent, toolCalls, finishReason };
        }

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          if (choice.finish_reason) {
            finishReason = choice.finish_reason;
          }

          const delta = choice.delta;
          if (!delta) continue;

          if (delta.content) {
            textContent += delta.content;
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallAccumulators.has(idx)) {
                toolCallAccumulators.set(idx, {
                  id: tc.id || `call_${idx}_${Date.now()}`,
                  name: tc.function?.name || '',
                  arguments: '',
                });
              }
              const acc = toolCallAccumulators.get(idx)!;
              if (tc.id) acc.id = tc.id;
              if (tc.function?.name) acc.name = tc.function.name;
              if (tc.function?.arguments) acc.arguments += tc.function.arguments;
            }
          }
        } catch {
          // skip unparseable SSE lines
        }
      }
    }

    const toolCalls: ToolCallMessage[] = [];
    for (const acc of toolCallAccumulators.values()) {
      toolCalls.push({
        id: acc.id,
        type: 'function',
        function: { name: acc.name, arguments: acc.arguments },
      });
    }
    return { textContent, toolCalls, finishReason };
  }

  private async *executeAnthropic(prompt: string, context: AgentContext, config: LLMConfig): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    this.abortControllers.set(context.sessionId, controller);

    const allMessages = this.buildMessages(prompt, context);
    const systemMsg = allMessages.find(m => m.role === 'system');
    const chatMessages = allMessages.filter(m => m.role !== 'system');

    const url = `${config.baseUrl}/messages`;

    const anthropicTools = this.toolRegistry.getDefinitions().map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      messages: chatMessages,
      stream: true,
    };
    if (systemMsg) {
      body.system = (systemMsg as { role: string; content: string }).content;
    }
    if (anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API returned ${response.status}: ${errorText.slice(0, 500)}`);
    }

    if (!response.body) throw new Error('No response body received');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield { type: 'text', content: parsed.delta.text };
          }
        } catch {
          // skip
        }
      }
    }
  }
}
