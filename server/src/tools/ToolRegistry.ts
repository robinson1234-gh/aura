import type { AgentContext } from '../types/index.js';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

export interface ToolExecutor {
  name: string;
  definition: ToolDefinition;
  execute(args: Record<string, unknown>, context: AgentContext): Promise<string>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolExecutor>();

  register(executor: ToolExecutor): void {
    this.tools.set(executor.name, executor);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async execute(name: string, argsJson: string, context: AgentContext): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `Error: Unknown tool "${name}". Available tools: ${this.getToolNames().join(', ')}`;
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson);
    } catch {
      return `Error: Invalid JSON arguments for tool "${name}": ${argsJson}`;
    }

    try {
      console.log(`[ToolRegistry] Executing tool: ${name}`, JSON.stringify(args).slice(0, 200));
      const result = await tool.execute(args, context);
      const truncated = result.length > 15000 ? result.slice(0, 15000) + '\n\n... (output truncated)' : result;
      console.log(`[ToolRegistry] Tool ${name} completed (${result.length} chars)`);
      return truncated;
    } catch (error: any) {
      console.error(`[ToolRegistry] Tool ${name} failed:`, error.message);
      return `Error executing tool "${name}": ${error.message}`;
    }
  }
}
