import { Router } from 'express';
import { getDatabase } from '../../db/database.js';
import { ConfigService } from '../../services/ConfigService.js';
import { ToolConfigService } from '../../services/ToolConfigService.js';
import { mcpManager } from '../../tools/McpManager.js';
import { v4 as uuid } from 'uuid';
import type { AgentBridge } from '../../agents/AgentBridge.js';

const configService = new ConfigService();
const toolConfigService = new ToolConfigService();

export function createAdminRoutes(agentBridge: AgentBridge): Router {
  const router = Router();

  /* ─── Dashboard Stats ─── */
  router.get('/stats', (_req, res) => {
    try {
      const db = getDatabase();
      const workspaceCount = (db.prepare('SELECT COUNT(*) as c FROM workspaces').get() as any)?.c || 0;
      const sessionCount = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as any)?.c || 0;
      const messageCount = (db.prepare('SELECT COUNT(*) as c FROM messages').get() as any)?.c || 0;
      const memoryCount = (db.prepare('SELECT COUNT(*) as c FROM memories').get() as any)?.c || 0;
      const toolCount = toolConfigService.listTools().length;
      const mcpCount = toolConfigService.listMcpServers().length;

      res.json({ workspaceCount, sessionCount, messageCount, memoryCount, toolCount, mcpCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Workspaces ─── */
  router.get('/workspaces', (_req, res) => {
    try {
      const db = getDatabase();
      const workspaces = db.prepare(`
        SELECT w.*,
          (SELECT COUNT(*) FROM sessions s WHERE s.workspace_id = w.id) as session_count,
          (SELECT COUNT(*) FROM sessions s JOIN messages m ON m.session_id = s.id WHERE s.workspace_id = w.id) as message_count
        FROM workspaces w
        ORDER BY w.path ASC
      `).all() as any[];

      const result = workspaces.map(w => {
        const configFiles = ['AGENT.md', 'SKILL.md', 'IDENTITY.md', 'MEMORY.md', 'USER.md', 'SOUL.md'];
        const configs: Record<string, boolean> = {};
        for (const f of configFiles) {
          const content = configService.getFile(w.path, f);
          configs[f] = !!content && content.length > 0;
        }

        return {
          id: w.id, name: w.name, path: w.path, level: w.level, parentId: w.parent_id,
          sessionCount: w.session_count, messageCount: w.message_count, configs,
          createdAt: w.created_at, updatedAt: w.updated_at,
        };
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Sessions ─── */
  router.get('/sessions', (req, res) => {
    try {
      const db = getDatabase();
      const workspaceId = req.query.workspaceId as string | undefined;

      let query = `
        SELECT s.*, w.path as workspace_path, w.name as workspace_name,
          (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) as message_count,
          (SELECT MAX(m.created_at) FROM messages m WHERE m.session_id = s.id) as last_message_at
        FROM sessions s
        JOIN workspaces w ON w.id = s.workspace_id
      `;
      const params: any[] = [];
      if (workspaceId) {
        query += ' WHERE s.workspace_id = ?';
        params.push(workspaceId);
      }
      query += ' ORDER BY s.updated_at DESC';

      const sessions = db.prepare(query).all(...params) as any[];

      res.json(sessions.map(s => ({
        id: s.id, title: s.title, workspaceId: s.workspace_id,
        workspacePath: s.workspace_path, workspaceName: s.workspace_name,
        workingDirectory: s.working_directory, messageCount: s.message_count,
        lastMessageAt: s.last_message_at, isActive: !!s.is_active,
        createdAt: s.created_at, updatedAt: s.updated_at,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Memories ─── */
  router.get('/memories', (_req, res) => {
    try {
      const db = getDatabase();
      const memories = db.prepare(`
        SELECT * FROM memories ORDER BY workspace_path, category, updated_at DESC
      `).all() as any[];

      res.json(memories.map(m => ({
        id: m.id, workspacePath: m.workspace_path, sessionId: m.session_id || null,
        category: m.category, content: m.content, source: m.source,
        relevance: m.relevance, accessCount: m.access_count,
        lastAccessed: m.last_accessed, createdAt: m.created_at, updatedAt: m.updated_at,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Bulk Deletes ─── */
  router.delete('/sessions/bulk', (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      const db = getDatabase();
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM messages WHERE session_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM sessions WHERE id IN (${placeholders})`).run(...ids);
      res.json({ success: true, deleted: ids.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/memories/bulk', (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      const db = getDatabase();
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`).run(...ids);
      res.json({ success: true, deleted: ids.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ═══════════════════════════════════════════════
     Custom Tools CRUD
     ═══════════════════════════════════════════════ */
  router.get('/tools', (_req, res) => {
    try {
      const tools = toolConfigService.listTools();
      const llmAgent = agentBridge.getLLMAgent();
      const registeredNames = llmAgent ? llmAgent.getRegisteredTools() : [];
      res.json({ tools, registeredTools: registeredNames });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/tools', (req, res) => {
    try {
      const { name, description, parameters, implementation, shellCommand, httpUrl, httpMethod } = req.body;
      if (!name || !description) return res.status(400).json({ error: 'name and description required' });

      const tool = {
        id: uuid(),
        name,
        description,
        parameters: parameters || { type: 'object' as const, properties: {}, required: [] },
        implementation: implementation || 'shell',
        shellCommand,
        httpUrl,
        httpMethod,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      toolConfigService.addTool(tool);
      agentBridge.getLLMAgent()?.reloadTools();
      res.status(201).json(tool);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/tools/:id', (req, res) => {
    try {
      const updated = toolConfigService.updateTool(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Tool not found' });
      agentBridge.getLLMAgent()?.reloadTools();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/tools/:id', (req, res) => {
    try {
      const deleted = toolConfigService.deleteTool(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Tool not found' });
      agentBridge.getLLMAgent()?.reloadTools();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ═══════════════════════════════════════════════
     MCP Servers CRUD + Connection Management
     ═══════════════════════════════════════════════ */
  router.get('/mcp', (_req, res) => {
    try {
      const servers = toolConfigService.listMcpServers();
      const connected = mcpManager.getConnectedServers();
      const connectedMap = new Map(connected.map(c => [c.id, c]));

      res.json(servers.map(s => ({
        ...s,
        connected: mcpManager.isConnected(s.id),
        discoveredTools: connectedMap.get(s.id)?.tools || [],
        toolCount: connectedMap.get(s.id)?.toolCount || 0,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/mcp', (req, res) => {
    try {
      const { name, description, transport, command, args, env, url } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const server = {
        id: uuid(),
        name,
        description: description || '',
        transport: transport || 'stdio',
        command,
        args: args || [],
        env: env || {},
        url,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      toolConfigService.addMcpServer(server);
      res.status(201).json(server);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/mcp/:id', (req, res) => {
    try {
      const updated = toolConfigService.updateMcpServer(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'MCP server not found' });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/mcp/:id', async (req, res) => {
    try {
      await mcpManager.disconnectServer(req.params.id);
      const deleted = toolConfigService.deleteMcpServer(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'MCP server not found' });
      agentBridge.getLLMAgent()?.reloadTools();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/mcp/:id/connect', async (req, res) => {
    try {
      const servers = toolConfigService.listMcpServers();
      const server = servers.find(s => s.id === req.params.id);
      if (!server) return res.status(404).json({ error: 'MCP server not found' });

      const tools = await mcpManager.connectServer(server);
      agentBridge.getLLMAgent()?.reloadTools();

      res.json({
        success: true,
        connected: true,
        toolCount: tools.length,
        tools: tools.map(t => t.name),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/mcp/:id/disconnect', async (req, res) => {
    try {
      await mcpManager.disconnectServer(req.params.id);
      agentBridge.getLLMAgent()?.reloadTools();
      res.json({ success: true, connected: false });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createAdminRoutes;
