import { spawn } from 'child_process';
import type { AgentContext } from '../types/index.js';
import type { ToolExecutor, ToolDefinition } from './ToolRegistry.js';
import type { CustomToolConfig } from '../services/ToolConfigService.js';

export class CustomToolExecutor implements ToolExecutor {
  name: string;
  definition: ToolDefinition;

  constructor(private config: CustomToolConfig) {
    this.name = config.name;
    this.definition = {
      type: 'function',
      function: {
        name: config.name,
        description: config.description,
        parameters: config.parameters,
      },
    };
  }

  async execute(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    if (this.config.implementation === 'shell') {
      return this.executeShell(args, context);
    }
    if (this.config.implementation === 'http') {
      return this.executeHttp(args);
    }
    return `Error: Unknown implementation type "${this.config.implementation}"`;
  }

  private executeShell(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    let command = this.config.shellCommand || '';
    for (const [key, val] of Object.entries(args)) {
      command = command.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(val));
    }

    const cwd = context.workingDirectory || process.cwd();

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn(command, {
        shell: true,
        cwd,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve(`Command timed out after 30 seconds.\nStdout:\n${stdout}\nStderr:\n${stderr}`);
      }, 30_000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        let result = '';
        if (stdout) result += stdout;
        if (stderr) result += (result ? '\n' : '') + `[stderr]\n${stderr}`;
        if (!result) result = `(No output, exit code: ${code})`;
        else result += `\n[exit code: ${code}]`;
        resolve(result);
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        resolve(`Failed to execute custom tool: ${err.message}`);
      });
    });
  }

  private async executeHttp(args: Record<string, unknown>): Promise<string> {
    const url = this.config.httpUrl || '';
    const method = (this.config.httpMethod || 'POST').toUpperCase();

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? JSON.stringify(args) : undefined,
      });

      const text = await response.text();
      if (!response.ok) {
        return `HTTP ${response.status}: ${text.slice(0, 2000)}`;
      }
      return text.slice(0, 15000);
    } catch (err: any) {
      return `HTTP request failed: ${err.message}`;
    }
  }
}
