import fs from 'fs';
import path from 'path';
import type { AgentContext } from '../types/index.js';
import type { ToolExecutor, ToolDefinition } from './ToolRegistry.js';

export class ReadFileTool implements ToolExecutor {
  name = 'read_file';

  definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file. Returns the file content as text.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or relative path to the file to read' },
        },
        required: ['path'],
      },
    },
  };

  async execute(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    const filePath = this.resolvePath(args.path as string, context);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.length > 50000) {
        return content.slice(0, 50000) + `\n\n... (file truncated, total ${content.length} characters)`;
      }
      return content;
    } catch (e: any) {
      return `Error reading file "${filePath}": ${e.message}`;
    }
  }

  private resolvePath(p: string, context: AgentContext): string {
    if (path.isAbsolute(p)) return p;
    return path.resolve(context.workingDirectory || process.cwd(), p);
  }
}

export class WriteFileTool implements ToolExecutor {
  name = 'write_file';

  definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file. Creates the file and parent directories if they do not exist. Overwrites existing content.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or relative path to the file to write' },
          content: { type: 'string', description: 'The content to write to the file' },
        },
        required: ['path', 'content'],
      },
    },
  };

  async execute(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    const filePath = this.resolvePath(args.path as string, context);
    const content = args.content as string;
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      return `File written successfully: ${filePath} (${content.length} characters)`;
    } catch (e: any) {
      return `Error writing file "${filePath}": ${e.message}`;
    }
  }

  private resolvePath(p: string, context: AgentContext): string {
    if (path.isAbsolute(p)) return p;
    return path.resolve(context.workingDirectory || process.cwd(), p);
  }
}

export class ListDirectoryTool implements ToolExecutor {
  name = 'list_directory';

  definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files and directories in a given path. Returns names with type indicators (/ for directories).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to list' },
          recursive: { type: 'string', description: 'Set to "true" for recursive listing (max 3 levels deep). Default is flat listing.' },
        },
        required: ['path'],
      },
    },
  };

  async execute(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    const dirPath = this.resolvePath(args.path as string, context);
    const recursive = String(args.recursive) === 'true';
    try {
      const entries = this.listDir(dirPath, recursive ? 3 : 0, '');
      return entries.join('\n') || '(empty directory)';
    } catch (e: any) {
      return `Error listing directory "${dirPath}": ${e.message}`;
    }
  }

  private listDir(dirPath: string, depth: number, prefix: string): string[] {
    const results: string[] = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      if (item.isDirectory()) {
        results.push(`${prefix}${item.name}/`);
        if (depth > 0) {
          results.push(...this.listDir(path.join(dirPath, item.name), depth - 1, prefix + '  '));
        }
      } else {
        results.push(`${prefix}${item.name}`);
      }
    }
    return results;
  }

  private resolvePath(p: string, context: AgentContext): string {
    if (path.isAbsolute(p)) return p;
    return path.resolve(context.workingDirectory || process.cwd(), p);
  }
}

export class SearchFilesTool implements ToolExecutor {
  name = 'search_files';

  definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search for a text pattern in files within a directory. Returns matching lines with file paths and line numbers.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Text or regex pattern to search for' },
          path: { type: 'string', description: 'Directory to search in. Defaults to workspace root.' },
        },
        required: ['pattern'],
      },
    },
  };

  async execute(args: Record<string, unknown>, context: AgentContext): Promise<string> {
    const pattern = args.pattern as string;
    const searchDir = this.resolvePath((args.path as string) || '.', context);

    try {
      const regex = new RegExp(pattern, 'i');
      const matches: string[] = [];
      this.searchRecursive(searchDir, regex, matches, 0);
      if (matches.length === 0) return `No matches found for "${pattern}" in ${searchDir}`;
      return matches.slice(0, 100).join('\n') + (matches.length > 100 ? `\n\n... and ${matches.length - 100} more matches` : '');
    } catch (e: any) {
      return `Error searching: ${e.message}`;
    }
  }

  private searchRecursive(dir: string, regex: RegExp, matches: string[], depth: number): void {
    if (depth > 5 || matches.length >= 100) return;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          this.searchRecursive(fullPath, regex, matches, depth + 1);
        } else if (this.isTextFile(item.name)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (regex.test(lines[i])) {
                matches.push(`${fullPath}:${i + 1}: ${lines[i].trim()}`);
              }
            }
          } catch { /* skip unreadable files */ }
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  private isTextFile(name: string): boolean {
    const ext = path.extname(name).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.py', '.html', '.css',
            '.yaml', '.yml', '.toml', '.xml', '.sql', '.sh', '.ps1', '.bat', '.cfg', '.ini',
            '.env', '.gitignore', '.rs', '.go', '.java', '.c', '.h', '.cpp', '.hpp'].includes(ext);
  }

  private resolvePath(p: string, context: AgentContext): string {
    if (path.isAbsolute(p)) return p;
    return path.resolve(context.workingDirectory || process.cwd(), p);
  }
}
