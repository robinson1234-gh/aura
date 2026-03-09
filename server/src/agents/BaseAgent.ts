import type { AgentPlugin, AgentContext, StreamChunk } from '../types/index.js';

export abstract class BaseAgent implements AgentPlugin {
  abstract name: string;
  abstract description: string;

  abstract execute(prompt: string, context: AgentContext): AsyncGenerator<StreamChunk>;
  abstract cancel(sessionId: string): void;

  async healthCheck(): Promise<boolean> {
    return true;
  }

  protected buildPrompt(userMessage: string, context: AgentContext): string {
    const parts: string[] = [];

    if (context.identity) {
      parts.push(`[IDENTITY]\n${context.identity}`);
    } else if (context.soul) {
      parts.push(`[SYSTEM PERSONA]\n${context.soul}`);
    }

    if (context.agent) {
      parts.push(`[AGENT INSTRUCTIONS]\n${context.agent}`);
    }

    if (context.skills) {
      parts.push(`[SKILLS & CAPABILITIES]\n${context.skills}`);
    }

    if (context.memory) {
      parts.push(`[MEMORY & CONTEXT]\n${context.memory}`);
    }

    if (context.user) {
      parts.push(`[USER PREFERENCES]\n${context.user}`);
    }

    if (context.history.length > 0) {
      const historyText = context.history
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');
      parts.push(`[CONVERSATION HISTORY]\n${historyText}`);
    }

    parts.push(`[USER MESSAGE]\n${userMessage}`);

    return parts.join('\n\n---\n\n');
  }
}
