import type { AgentContext } from '../types/index.js';
import type { ToolExecutor, ToolDefinition } from './ToolRegistry.js';
import { CursorAgent } from '../agents/CursorAgent.js';
import { spawnSafe } from './spawnSafe.js';

export class CursorTool implements ToolExecutor {
  name = 'cursor_agent';

  definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'cursor_agent',
      description: 'Send a coding task to the Cursor Agent CLI. Use this for complex coding tasks like writing code, refactoring, debugging, creating files, or making changes across a project. The agent has full access to read/write files and run commands.',
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'The coding task description for the Cursor agent to execute',
          },
          workspace: {
            type: 'string',
            description: 'Optional workspace directory path. Defaults to current working directory.',
          },
        },
        required: ['task'],
      },
    },
  };

  private getApiKey(): string | null {
    if (process.env.CURSOR_API_KEY) return process.env.CURSOR_API_KEY;
    const config = CursorAgent.loadConfig();
    return config?.apiKey || null;
  }

  async execute(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    const task = args.task as string;
    const workspace = (args.workspace as string) || context.workingDirectory;
    const apiKey = this.getApiKey();

    const cliArgs = [
      '--print',
      '--output-format', 'stream-json',
      '--stream-partial-output',
      '--force',
      '--trust',
      '--', task,
    ];
    if (apiKey) {
      cliArgs.push('--api-key', apiKey);
    }
    if (workspace) {
      cliArgs.push('--workspace', workspace);
    }

    return new Promise((resolve) => {
      let buffer = '';
      let stderr = '';
      const textParts: string[] = [];
      const toolSteps: { name: string; args: string; result?: string }[] = [];
      let currentToolName = '';
      let currentToolArgs = '';

      const env = { ...process.env };
      if (apiKey) env.CURSOR_API_KEY = apiKey;

      const proc = spawnSafe('agent', cliArgs, {
        shell: true,
        cwd: workspace || undefined,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

      proc.stdout?.on('data', (d: Buffer) => {
        buffer += d.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const t = data.type;

            if (t === 'message_delta' || t === 'content_block_delta') {
              const text = data.payload?.text || data.delta?.text || '';
              if (text) textParts.push(text);
            } else if (t === 'tool_use_begin' || t === 'tool_call' || t === 'tool_use' || t === 'content_block_start') {
              const payload = data.payload || data.content_block || data;
              currentToolName = payload.name || data.tool_name || 'tool';
              const input = payload.input;
              currentToolArgs = input ? (typeof input === 'string' ? input : JSON.stringify(input)) : '{}';
            } else if (t === 'tool_use_delta' || t === 'input_json_delta') {
              const partial = data.payload?.input_delta || data.delta?.partial_json || '';
              if (partial) currentToolArgs += typeof partial === 'string' ? partial : JSON.stringify(partial);
            } else if (t === 'tool_result' || t === 'tool_use_end' || t === 'content_block_stop') {
              const output = data.payload?.output ?? data.payload?.content ?? data.content ?? data.result;
              const resultStr = output !== undefined && output !== null
                ? (typeof output === 'string' ? output : JSON.stringify(output))
                : `Tool ${currentToolName} completed`;
              toolSteps.push({ name: currentToolName, args: currentToolArgs, result: resultStr });
              currentToolName = '';
              currentToolArgs = '';
            } else {
              const text = data.content || data.text || data.payload?.text || data.payload?.content;
              if (text) textParts.push(text);
            }
          } catch {
            if (line.trim()) textParts.push(line);
          }
        }
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve(buildResult(textParts, toolSteps, `Timed out after 30 minutes.`));
      }, 30 * 60 * 1000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        const note = code !== 0 ? `Process exited with code ${code}. Stderr: ${stderr.slice(0, 1000)}` : undefined;
        resolve(buildResult(textParts, toolSteps, note));
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        resolve(`Failed to start Cursor agent: ${err.message}`);
      });
    });
  }
}

function buildResult(
  textParts: string[],
  toolSteps: { name: string; args: string; result?: string }[],
  note?: string,
): string {
  const sections: string[] = [];

  if (toolSteps.length > 0) {
    sections.push('## Steps Performed\n');
    for (let i = 0; i < toolSteps.length; i++) {
      const s = toolSteps[i];
      sections.push(`${i + 1}. **${s.name}**`);
      if (s.args && s.args !== '{}') {
        try {
          const parsed = JSON.parse(s.args);
          const preview = parsed.path || parsed.command || parsed.file_path || parsed.query || '';
          if (preview) sections.push(`   \`${typeof preview === 'string' ? preview.slice(0, 120) : JSON.stringify(preview).slice(0, 120)}\``);
        } catch { /* skip */ }
      }
      if (s.result) {
        const trimmed = s.result.length > 500 ? s.result.slice(0, 500) + '...(truncated)' : s.result;
        sections.push(`   Result: ${trimmed}`);
      }
    }
    sections.push('');
  }

  const text = textParts.join('');
  if (text) {
    sections.push(text);
  }

  if (note) {
    sections.push(`\n---\nNote: ${note}`);
  }

  return sections.join('\n') || '(No output from Cursor agent)';
}
