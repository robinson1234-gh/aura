import { LLMAgent } from '../agents/LLMAgent.js';

const SYSTEM_PROMPTS: Record<string, string> = {
  'AGENT.md': `You are an expert at writing AI agent configuration documents.
Given a user's brief description of their project or needs, generate a well-structured AGENT.md file in Markdown.
The file should define:
- Agent behavior and personality for the workspace
- Tool preferences (when to use cursor_agent, shell, file operations)
- Operating constraints and rules
- Coding standards to follow
Keep it concise but comprehensive. Use clear Markdown headings and bullet points.
Output ONLY the Markdown content, no explanations.`,

  'SKILL.md': `You are an expert at writing AI skill configuration documents.
Given a user's brief description of their project or domain, generate a well-structured SKILL.md file in Markdown.
The file should define:
- Technical skills and knowledge areas relevant to the project
- Programming languages, frameworks, and libraries used
- Domain-specific expertise needed
- Best practices and patterns to follow
Keep it concise but comprehensive. Use clear Markdown headings and bullet points.
Output ONLY the Markdown content, no explanations.`,

  'IDENTITY.md': `You are an expert at writing AI identity/persona configuration documents.
Given a user's brief description, generate a well-structured IDENTITY.md file in Markdown.
The file should define:
- The AI agent's persona and role
- Communication style and tone
- Values and priorities
- How to interact with the user
Keep it concise but comprehensive. Use clear Markdown headings and bullet points.
Output ONLY the Markdown content, no explanations.`,

  'MEMORY.md': `You are an expert at writing AI memory/context configuration documents.
Given a user's brief description of their project, generate a well-structured MEMORY.md file in Markdown.
The file should define:
- Key project decisions and architecture choices
- Important patterns and conventions used
- Known issues or constraints
- Technology stack details
- Environment and deployment notes
Keep it concise but comprehensive. Use clear Markdown headings and bullet points.
Output ONLY the Markdown content, no explanations.`,

  'USER.md': `You are an expert at writing user preference configuration documents.
Given a user's brief description of their working style, generate a well-structured USER.md file in Markdown.
The file should define:
- Working style preferences
- Communication language preferences
- IDE and environment details
- Review and approval preferences
- Any special instructions for the AI
Keep it concise but comprehensive. Use clear Markdown headings and bullet points.
Output ONLY the Markdown content, no explanations.`,

  'SOUL.md': `You are an expert at writing AI soul/persona configuration documents.
Given a user's brief description, generate a well-structured SOUL.md file in Markdown.
The file should define the AI agent's core personality, values, communication style, and behavioral guidelines.
Keep it concise but comprehensive. Use clear Markdown headings and bullet points.
Output ONLY the Markdown content, no explanations.`,
};

export class GenerateService {
  async generate(filename: string, description: string, workspacePath: string): Promise<string> {
    const config = LLMAgent.loadConfig();
    if (!config || !config.apiKey) {
      throw new Error('LLM not configured. Please set up your LLM API key in Settings > LLM first.');
    }

    const systemPrompt = SYSTEM_PROMPTS[filename] || SYSTEM_PROMPTS['SKILL.md'];

    const userPrompt = `Workspace: ${workspacePath}

User description:
${description}

Generate the ${filename} content:`;

    const url = `${config.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        ...LLMAgent.maxTokensParam(config, 2048),
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response. Check your API key and model.');
    }

    return content.trim();
  }
}
