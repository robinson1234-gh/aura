import type { AgentPlugin, AgentContext, StreamChunk } from '../types/index.js';
import { CursorAgent } from './CursorAgent.js';
import { EchoAgent } from './EchoAgent.js';
import { LLMAgent } from './LLMAgent.js';

export class AgentBridge {
  private plugins = new Map<string, AgentPlugin>();
  private defaultPlugin = 'echo';

  constructor() {
    this.register(new EchoAgent());
    this.register(new CursorAgent());
    this.register(new LLMAgent());
  }

  async autoSelectDefault(): Promise<void> {
    // Prefer LLM if configured, then Cursor CLI, then echo fallback
    const llm = this.plugins.get('llm');
    if (llm && await llm.healthCheck()) {
      this.defaultPlugin = 'llm';
      console.log('[AgentBridge] LLM API configured — using llm agent');
      return;
    }

    const cursor = this.plugins.get('cursor');
    if (cursor && await cursor.healthCheck()) {
      this.defaultPlugin = 'cursor';
      console.log('[AgentBridge] Cursor CLI detected — using cursor agent');
      return;
    }

    this.defaultPlugin = 'echo';
    console.log('[AgentBridge] No LLM or Cursor CLI available — using echo agent (fallback)');
    console.log('[AgentBridge] Configure an LLM: PUT http://localhost:3001/api/llm/config');
  }

  setDefault(name: string): void {
    if (!this.plugins.has(name)) throw new Error(`Agent not found: ${name}`);
    this.defaultPlugin = name;
    console.log(`[AgentBridge] Default agent changed to: ${name}`);
  }

  register(plugin: AgentPlugin): void {
    this.plugins.set(plugin.name, plugin);
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

  listPlugins(): Array<{ name: string; description: string; isDefault: boolean }> {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      description: p.description,
      isDefault: p.name === this.defaultPlugin,
    }));
  }

  async *execute(prompt: string, context: AgentContext, pluginName?: string): AsyncGenerator<StreamChunk> {
    const plugin = this.getPlugin(pluginName);
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
      results[name] = await plugin.healthCheck();
    }
    return results;
  }
}
