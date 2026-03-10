import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.workagent');
const TOOLS_CONFIG = path.join(CONFIG_DIR, 'custom-tools.json');
const MCP_CONFIG = path.join(CONFIG_DIR, 'mcp-servers.json');

export interface CustomToolConfig {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  implementation: 'shell' | 'http';
  shellCommand?: string;
  httpUrl?: string;
  httpMethod?: string;
  enabled: boolean;
  createdAt: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  description: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled: boolean;
  createdAt: string;
}

function ensureDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export class ToolConfigService {
  /* ─── Custom Tools ─── */
  listTools(): CustomToolConfig[] {
    try {
      if (fs.existsSync(TOOLS_CONFIG)) {
        return JSON.parse(fs.readFileSync(TOOLS_CONFIG, 'utf-8'));
      }
    } catch { /* ignore */ }
    return [];
  }

  saveTools(tools: CustomToolConfig[]): void {
    ensureDir();
    fs.writeFileSync(TOOLS_CONFIG, JSON.stringify(tools, null, 2), 'utf-8');
  }

  addTool(tool: CustomToolConfig): void {
    const tools = this.listTools();
    tools.push(tool);
    this.saveTools(tools);
  }

  updateTool(id: string, updates: Partial<CustomToolConfig>): CustomToolConfig | null {
    const tools = this.listTools();
    const idx = tools.findIndex(t => t.id === id);
    if (idx < 0) return null;
    tools[idx] = { ...tools[idx], ...updates };
    this.saveTools(tools);
    return tools[idx];
  }

  deleteTool(id: string): boolean {
    const tools = this.listTools();
    const filtered = tools.filter(t => t.id !== id);
    if (filtered.length === tools.length) return false;
    this.saveTools(filtered);
    return true;
  }

  /* ─── MCP Servers ─── */
  listMcpServers(): McpServerConfig[] {
    try {
      if (fs.existsSync(MCP_CONFIG)) {
        return JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf-8'));
      }
    } catch { /* ignore */ }
    return [];
  }

  saveMcpServers(servers: McpServerConfig[]): void {
    ensureDir();
    fs.writeFileSync(MCP_CONFIG, JSON.stringify(servers, null, 2), 'utf-8');
  }

  addMcpServer(server: McpServerConfig): void {
    const servers = this.listMcpServers();
    servers.push(server);
    this.saveMcpServers(servers);
  }

  updateMcpServer(id: string, updates: Partial<McpServerConfig>): McpServerConfig | null {
    const servers = this.listMcpServers();
    const idx = servers.findIndex(s => s.id === id);
    if (idx < 0) return null;
    servers[idx] = { ...servers[idx], ...updates };
    this.saveMcpServers(servers);
    return servers[idx];
  }

  deleteMcpServer(id: string): boolean {
    const servers = this.listMcpServers();
    const filtered = servers.filter(s => s.id !== id);
    if (filtered.length === servers.length) return false;
    this.saveMcpServers(filtered);
    return true;
  }
}
