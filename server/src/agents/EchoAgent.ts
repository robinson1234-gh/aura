import { BaseAgent } from './BaseAgent.js';
import type { AgentContext, StreamChunk } from '../types/index.js';

/**
 * Built-in agent that works without any external tools.
 * Returns a formatted echo of the user message along with session context info.
 * Useful for testing the full pipeline and as a fallback when Cursor CLI is unavailable.
 */
export class EchoAgent extends BaseAgent {
  name = 'echo';
  description = 'Built-in echo agent for testing and fallback';

  async *execute(prompt: string, context: AgentContext): AsyncGenerator<StreamChunk> {
    const lines = [
      `**Received your message** in workspace \`${context.workspacePath}\`\n`,
      `---\n`,
      `**Your message:**\n`,
      `> ${prompt}\n\n`,
    ];

    if (context.skills) {
      lines.push(`**Active skills:** loaded from workspace hierarchy\n\n`);
    }
    if (context.soul) {
      lines.push(`**Soul/persona:** configured\n\n`);
    }

    lines.push(`**Session history:** ${context.history.length} messages in context\n\n`);
    lines.push(`---\n\n`);
    lines.push(`*This response is from the built-in **echo agent**. `);
    lines.push(`To get AI-powered responses, configure a Cursor CLI or LLM API agent in your workspace settings.*\n`);

    const fullText = lines.join('');

    // Stream word by word to demonstrate streaming
    const words = fullText.split(/(?<=\s)/);
    for (const word of words) {
      yield { type: 'text', content: word };
      await new Promise(r => setTimeout(r, 15));
    }

    yield { type: 'done', content: '' };
  }

  cancel(_sessionId: string): void {
    // nothing to cancel
  }

  override async healthCheck(): Promise<boolean> {
    return true;
  }
}
