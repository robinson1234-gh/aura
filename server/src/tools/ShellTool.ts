import { spawn } from 'child_process';
import type { AgentContext } from '../types/index.js';
import type { ToolExecutor, ToolDefinition } from './ToolRegistry.js';

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+[\/\\]/i,
  /format\s+[a-z]:/i,
  /del\s+\/s\s+\/q\s+[a-z]:\\/i,
];

export class ShellTool implements ToolExecutor {
  name = 'run_shell';

  definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'run_shell',
      description: 'Execute a shell command and return its output. Use for running scripts, checking system state, installing packages, running tests, git operations, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for the command. Defaults to workspace directory.',
          },
        },
        required: ['command'],
      },
    },
  };

  async execute(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    const command = args.command as string;
    const cwd = (args.cwd as string) || context.workingDirectory || process.cwd();

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return `Error: Command blocked by safety filter. Pattern matched: ${pattern}`;
      }
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      // For ShellTool, the entire command IS the shell expression, so
      // shell: true with no separate args is correct (user provides the
      // full command string). The cwd may contain spaces, but spawn's
      // cwd option handles that natively via the OS API, not the shell.
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
        resolve(`Command timed out after 60 seconds.\nStdout:\n${stdout}\nStderr:\n${stderr}`);
      }, 60_000);

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
        resolve(`Failed to execute command: ${err.message}`);
      });
    });
  }
}
