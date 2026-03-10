import type { ToolExecutor, ToolDefinition } from './ToolRegistry.js';
import type { AgentContext } from '../types/index.js';
import type { McpServerConfig } from '../services/ToolConfigService.js';

interface McpConnection {
  config: McpServerConfig;
  client: any;
  transport: any;
  tools: McpToolExecutor[];
}

class McpToolExecutor implements ToolExecutor {
  name: string;
  definition: ToolDefinition;

  constructor(
    private mcpClient: any,
    private serverName: string,
    toolName: string,
    description: string,
    inputSchema: any,
  ) {
    this.name = `mcp_${serverName}_${toolName}`;
    this.definition = {
      type: 'function',
      function: {
        name: this.name,
        description: `[MCP: ${serverName}] ${description}`,
        parameters: inputSchema || { type: 'object', properties: {}, required: [] },
      },
    };
  }

  async execute(args: Record<string, unknown>, _context: AgentContext): Promise<string> {
    const rawName = this.name.replace(`mcp_${this.serverName}_`, '');
    try {
      const result = await this.mcpClient.callTool({ name: rawName, arguments: args });
      if (!result.content || !Array.isArray(result.content)) {
        return JSON.stringify(result);
      }
      return result.content
        .map((c: any) => c.type === 'text' ? c.text : JSON.stringify(c))
        .join('\n');
    } catch (err: any) {
      return `MCP tool error: ${err.message}`;
    }
  }
}

export class McpManager {
  private connections = new Map<string, McpConnection>();

  async connectServer(config: McpServerConfig): Promise<McpToolExecutor[]> {
    if (this.connections.has(config.id)) {
      await this.disconnectServer(config.id);
    }

    if (config.transport !== 'stdio') {
      console.log(`[McpManager] Transport "${config.transport}" not yet supported for ${config.name}`);
      return [];
    }

    if (!config.command) {
      console.log(`[McpManager] No command specified for ${config.name}`);
      return [];
    }

    try {
      console.log(`[McpManager] Connecting to MCP server: ${config.name} (${config.command} ${(config.args || []).join(' ')})`);

      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
      });

      const client = new Client(
        { name: 'workagent', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);

      const { tools: mcpTools } = await client.listTools();
      console.log(`[McpManager] ${config.name}: discovered ${mcpTools.length} tools`);

      const executors: McpToolExecutor[] = mcpTools.map((t: any) =>
        new McpToolExecutor(client, config.name, t.name, t.description || '', t.inputSchema)
      );

      this.connections.set(config.id, { config, client, transport, tools: executors });
      return executors;
    } catch (err: any) {
      console.error(`[McpManager] Failed to connect ${config.name}:`, err.message);
      return [];
    }
  }

  async disconnectServer(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (conn) {
      try {
        await conn.client.close();
      } catch { /* ignore */ }
      this.connections.delete(id);
      console.log(`[McpManager] Disconnected: ${conn.config.name}`);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const id of this.connections.keys()) {
      await this.disconnectServer(id);
    }
  }

  getConnection(id: string): McpConnection | undefined {
    return this.connections.get(id);
  }

  getAllTools(): McpToolExecutor[] {
    const all: McpToolExecutor[] = [];
    for (const conn of this.connections.values()) {
      all.push(...conn.tools);
    }
    return all;
  }

  getConnectedServers(): { id: string; name: string; toolCount: number; tools: string[] }[] {
    const result: { id: string; name: string; toolCount: number; tools: string[] }[] = [];
    for (const conn of this.connections.values()) {
      result.push({
        id: conn.config.id,
        name: conn.config.name,
        toolCount: conn.tools.length,
        tools: conn.tools.map(t => t.name),
      });
    }
    return result;
  }

  isConnected(id: string): boolean {
    return this.connections.has(id);
  }
}

export const mcpManager = new McpManager();
