import type { AgentPlugin, AgentContext, StreamChunk } from '../types/index.js';
import { CursorAgent } from './CursorAgent.js';
import { EchoAgent } from './EchoAgent.js';
import { LLMAgent } from './LLMAgent.js';
import { getDatabase } from '../db/database.js';
import { v4 as uuid } from 'uuid';

export interface AgentRecord {
  id: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class AgentBridge {
  private plugins = new Map<string, AgentPlugin>();
  private disabledAgents = new Set<string>();
  private defaultPlugin = 'echo';

  constructor() {
    this.register(new EchoAgent());
    this.register(new CursorAgent());
    this.register(new LLMAgent());
  }

  syncFromDatabase(): void {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM agents').all() as any[];

      if (rows.length === 0) {
        for (const plugin of this.plugins.values()) {
          const id = uuid();
          db.prepare(
            'INSERT OR IGNORE INTO agents (id, name, type, description, enabled, is_default) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(id, plugin.name, plugin.name, plugin.description, 1, plugin.name === this.defaultPlugin ? 1 : 0);
        }
        return;
      }

      this.disabledAgents.clear();
      let foundDefault = false;
      for (const row of rows) {
        if (!row.enabled) {
          this.disabledAgents.add(row.name as string);
        }
        if (row.is_default) {
          this.defaultPlugin = row.name as string;
          foundDefault = true;
        }
      }
      if (!foundDefault && rows.length > 0) {
        const first = rows.find((r: any) => r.enabled) || rows[0];
        this.defaultPlugin = first.name as string;
      }
    } catch {
      // DB not ready yet — will sync later
    }
  }

  async autoSelectDefault(): Promise<void> {
    const llm = this.plugins.get('llm');
    if (llm && !this.disabledAgents.has('llm') && await llm.healthCheck()) {
      this.setDefault('llm');
      console.log('[AgentBridge] LLM API configured — using llm agent');
      return;
    }

    const cursor = this.plugins.get('cursor');
    if (cursor && !this.disabledAgents.has('cursor') && await cursor.healthCheck()) {
      this.setDefault('cursor');
      console.log('[AgentBridge] Cursor CLI detected — using cursor agent');
      return;
    }

    this.setDefault('echo');
    console.log('[AgentBridge] No LLM or Cursor CLI available — using echo agent (fallback)');
    console.log('[AgentBridge] Configure an LLM: PUT http://localhost:3001/api/llm/config');
  }

  setDefault(name: string): void {
    if (!this.plugins.has(name)) throw new Error(`Agent not found: ${name}`);
    this.defaultPlugin = name;
    console.log(`[AgentBridge] Default agent changed to: ${name}`);
    try {
      const db = getDatabase();
      db.prepare('UPDATE agents SET is_default = 0').run();
      db.prepare('UPDATE agents SET is_default = 1 WHERE name = ?').run(name);
    } catch { /* DB may not be ready */ }
  }

  register(plugin: AgentPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  isEnabled(name: string): boolean {
    return !this.disabledAgents.has(name);
  }

  setEnabled(name: string, enabled: boolean): void {
    if (!this.plugins.has(name)) throw new Error(`Agent not found: ${name}`);
    if (enabled) {
      this.disabledAgents.delete(name);
    } else {
      this.disabledAgents.add(name);
      if (this.defaultPlugin === name) {
        const fallback = Array.from(this.plugins.keys()).find(n => !this.disabledAgents.has(n)) || 'echo';
        this.setDefault(fallback);
      }
    }
    try {
      const db = getDatabase();
      db.prepare('UPDATE agents SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?').run(enabled ? 1 : 0, name);
    } catch { /* ignore */ }
  }

  getPlugin(name?: string): AgentPlugin {
    const pluginName = name || this.defaultPlugin;
    const plugin = this.plugins.get(pluginName);
    if (!plugin) throw new Error(`Agent plugin not found: ${pluginName}`);
    return plugin;
  }

  getDefaultName(): string {
    return this.defaultPlugin;
  }

  listPlugins(): Array<{ name: string; description: string; isDefault: boolean; enabled: boolean }> {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      description: p.description,
      isDefault: p.name === this.defaultPlugin,
      enabled: !this.disabledAgents.has(p.name),
    }));
  }

  getAllAgentRecords(): AgentRecord[] {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all() as any[];
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        description: r.description,
        enabled: !!r.enabled,
        isDefault: !!r.is_default,
        config: JSON.parse(r.config || '{}'),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return this.listPlugins().map(p => ({
        id: p.name,
        name: p.name,
        type: p.name,
        description: p.description,
        enabled: p.enabled,
        isDefault: p.isDefault,
        config: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  getAgentRecord(id: string): AgentRecord | null {
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        enabled: !!row.enabled,
        isDefault: !!row.is_default,
        config: JSON.parse(row.config || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch { return null; }
  }

  createAgentRecord(data: { name: string; type: string; description: string; config?: Record<string, unknown> }): AgentRecord {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM agents WHERE name = ?').get(data.name);
    if (existing) throw new Error(`Agent with name "${data.name}" already exists`);

    const id = uuid();
    db.prepare(
      'INSERT INTO agents (id, name, type, description, enabled, is_default, config) VALUES (?, ?, ?, ?, 1, 0, ?)'
    ).run(id, data.name, data.type, data.description, JSON.stringify(data.config || {}));

    return this.getAgentRecord(id)!;
  }

  updateAgentRecord(id: string, data: { name?: string; description?: string; type?: string; config?: Record<string, unknown> }): AgentRecord {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!row) throw new Error('Agent not found');

    const name = data.name ?? row.name;
    const description = data.description ?? row.description;
    const type = data.type ?? row.type;
    const config = data.config !== undefined ? JSON.stringify(data.config) : row.config;

    if (data.name && data.name !== row.name) {
      const dup = db.prepare('SELECT id FROM agents WHERE name = ? AND id != ?').get(data.name, id);
      if (dup) throw new Error(`Agent with name "${data.name}" already exists`);
    }

    db.prepare(
      'UPDATE agents SET name = ?, description = ?, type = ?, config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, description, type, config, id);

    return this.getAgentRecord(id)!;
  }

  deleteAgentRecord(id: string): void {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!row) throw new Error('Agent not found');
    const builtIn = ['echo', 'cursor', 'llm'];
    if (builtIn.includes(row.name)) throw new Error(`Cannot delete built-in agent "${row.name}"`);
    if (row.is_default) throw new Error('Cannot delete the default agent');
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  }

  async *execute(prompt: string, context: AgentContext, pluginName?: string): AsyncGenerator<StreamChunk> {
    const plugin = this.getPlugin(pluginName);
    if (this.disabledAgents.has(plugin.name)) {
      throw new Error(`Agent "${plugin.name}" is disabled`);
    }
    console.log(`[AgentBridge] Executing with agent: ${plugin.name}`);
    yield* plugin.execute(prompt, context);
  }

  cancel(sessionId: string, pluginName?: string): void {
    if (pluginName) {
      this.getPlugin(pluginName).cancel(sessionId);
    } else {
      for (const plugin of this.plugins.values()) {
        plugin.cancel(sessionId);
      }
    }
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, plugin] of this.plugins) {
      if (this.disabledAgents.has(name)) {
        results[name] = false;
        continue;
      }
      results[name] = await plugin.healthCheck();
    }
    return results;
  }
}
