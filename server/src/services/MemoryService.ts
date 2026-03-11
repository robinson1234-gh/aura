import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/database.js';
import { LLMAgent } from '../agents/LLMAgent.js';

export type MemoryCategory = 'semantic' | 'episodic' | 'procedural';
export type MemorySource = 'auto' | 'manual' | 'system';

export interface MemoryEntry {
  id: string;
  workspacePath: string;
  sessionId: string | null;
  category: MemoryCategory;
  content: string;
  source: MemorySource;
  relevance: number;
  accessCount: number;
  lastAccessed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  sessionId: string;
  summary: string;
  messageRangeStart: string;
  messageRangeEnd: string;
  messageCount: number;
  createdAt: string;
}

const EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the following conversation and extract important facts, decisions, preferences, and knowledge that should be remembered for future interactions.

Categorize each memory as:
- **semantic**: Facts, knowledge, decisions, technical details, architecture choices
- **episodic**: Past events, what happened, outcomes of actions, problems encountered and solutions
- **procedural**: User preferences, workflow patterns, coding style rules, how-to knowledge

Output as a JSON array of objects with "category" and "content" fields. Each content should be a concise, self-contained statement. Only extract genuinely useful information worth remembering. If nothing worth remembering, return [].

Example output:
[
  {"category": "semantic", "content": "The project uses React 18 with TypeScript and Tailwind CSS"},
  {"category": "episodic", "content": "User encountered EADDRINUSE error on port 3001 - fixed by killing the process"},
  {"category": "procedural", "content": "User prefers code examples over lengthy explanations"}
]`;

const SUMMARY_PROMPT = `Summarize the following conversation into a concise paragraph that captures the key topics discussed, decisions made, and outcomes. This summary will be used as context for future messages in this conversation. Keep it under 300 words.`;

const MEMORY_DEDUP_PROMPT = `You are a memory deduplication system. Given an existing memory and a new candidate memory, decide what to do.

Respond with EXACTLY one of:
- KEEP_BOTH - if they contain different information
- UPDATE - if the new memory is a better/updated version of the existing one
- SKIP - if the new memory is redundant (already captured by existing)

Respond with only the action word, nothing else.`;

export class MemoryService {
  /* ───── CRUD ───── */

  list(workspacePath: string, category?: MemoryCategory, sessionId?: string): MemoryEntry[] {
    const db = getDatabase();

    if (sessionId) {
      if (category) {
        const rows = db.prepare(
          'SELECT * FROM memories WHERE session_id = ? AND category = ? ORDER BY relevance DESC, updated_at DESC'
        ).all(sessionId, category) as any[];
        return rows.map(this.mapRow);
      }
      const rows = db.prepare(
        'SELECT * FROM memories WHERE session_id = ? ORDER BY relevance DESC, updated_at DESC'
      ).all(sessionId) as any[];
      return rows.map(this.mapRow);
    }

    if (category) {
      const rows = db.prepare(
        'SELECT * FROM memories WHERE (workspace_path = ? OR ? LIKE workspace_path || \'/%\') AND category = ? AND session_id IS NULL ORDER BY relevance DESC, updated_at DESC'
      ).all(workspacePath, workspacePath, category) as any[];
      return rows.map(this.mapRow);
    }

    const rows = db.prepare(
      'SELECT * FROM memories WHERE (workspace_path = ? OR ? LIKE workspace_path || \'/%\') AND session_id IS NULL ORDER BY relevance DESC, updated_at DESC'
    ).all(workspacePath, workspacePath) as any[];
    return rows.map(this.mapRow);
  }

  listBySession(sessionId: string): MemoryEntry[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM memories WHERE session_id = ? ORDER BY category, relevance DESC, updated_at DESC'
    ).all(sessionId) as any[];
    return rows.map(this.mapRow);
  }

  listExact(workspacePath: string, sessionId?: string): MemoryEntry[] {
    const db = getDatabase();
    if (sessionId) {
      const rows = db.prepare(
        'SELECT * FROM memories WHERE session_id = ? ORDER BY category, relevance DESC, updated_at DESC'
      ).all(sessionId) as any[];
      return rows.map(this.mapRow);
    }
    const rows = db.prepare(
      'SELECT * FROM memories WHERE workspace_path = ? AND session_id IS NULL ORDER BY category, relevance DESC, updated_at DESC'
    ).all(workspacePath) as any[];
    return rows.map(this.mapRow);
  }

  getById(id: string): MemoryEntry | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  create(workspacePath: string, category: MemoryCategory, content: string, source: MemorySource = 'manual', sessionId?: string): MemoryEntry {
    const db = getDatabase();
    const id = uuid();
    db.prepare(
      'INSERT INTO memories (id, workspace_path, session_id, category, content, source) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, workspacePath, sessionId || null, category, content, source);
    return this.getById(id)!;
  }

  update(id: string, content: string, category?: MemoryCategory): MemoryEntry | null {
    const db = getDatabase();
    if (category) {
      db.prepare('UPDATE memories SET content = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content, category, id);
    } else {
      db.prepare('UPDATE memories SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content, id);
    }
    return this.getById(id);
  }

  delete(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  }

  /* ───── Retrieval for agent context ───── */

  retrieveForContext(workspacePath: string, sessionId?: string, maxEntries = 30): string {
    const db = getDatabase();

    let rows: any[];
    if (sessionId) {
      rows = db.prepare(`
        SELECT * FROM memories 
        WHERE session_id = ?
        ORDER BY relevance DESC, access_count DESC, updated_at DESC
        LIMIT ?
      `).all(sessionId, maxEntries) as any[];
    } else {
      rows = db.prepare(`
        SELECT * FROM memories 
        WHERE (workspace_path = ? OR ? LIKE workspace_path || '/%') AND session_id IS NULL
        ORDER BY relevance DESC, access_count DESC, updated_at DESC
        LIMIT ?
      `).all(workspacePath, workspacePath, maxEntries) as any[];
    }

    if (rows.length === 0) return '';

    db.prepare(`
      UPDATE memories SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
      WHERE id IN (${rows.map(() => '?').join(',')})
    `).run(...rows.map((r: any) => r.id));

    const grouped: Record<string, string[]> = { semantic: [], episodic: [], procedural: [] };
    for (const row of rows) {
      const cat = row.category || 'semantic';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(row.content);
    }

    const parts: string[] = [];
    if (grouped.semantic.length) {
      parts.push('## Knowledge & Facts\n' + grouped.semantic.map(m => `- ${m}`).join('\n'));
    }
    if (grouped.episodic.length) {
      parts.push('## Past Experiences\n' + grouped.episodic.map(m => `- ${m}`).join('\n'));
    }
    if (grouped.procedural.length) {
      parts.push('## Preferences & Patterns\n' + grouped.procedural.map(m => `- ${m}`).join('\n'));
    }

    return parts.join('\n\n');
  }

  /* ───── Conversation summary ───── */

  getSessionSummaries(sessionId: string): ConversationSummary[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM conversation_summaries WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as any[];
    return rows.map(this.mapSummaryRow);
  }

  async summarizeIfNeeded(sessionId: string, messages: { id: string; role: string; content: string }[], threshold = 30): Promise<string | null> {
    if (messages.length < threshold) return null;

    const existingSummaries = this.getSessionSummaries(sessionId);
    const lastSummarizedEnd = existingSummaries.length > 0
      ? existingSummaries[existingSummaries.length - 1].messageRangeEnd
      : null;

    let startIdx = 0;
    if (lastSummarizedEnd) {
      startIdx = messages.findIndex(m => m.id === lastSummarizedEnd);
      if (startIdx >= 0) startIdx += 1;
      else startIdx = 0;
    }

    const unsummarized = messages.slice(startIdx);
    if (unsummarized.length < threshold / 2) return null;

    const toSummarize = unsummarized.slice(0, -10);
    if (toSummarize.length < 6) return null;

    const conversationText = toSummarize
      .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}`)
      .join('\n\n');

    const summary = await this.callLLM(
      SUMMARY_PROMPT,
      `Conversation to summarize:\n\n${conversationText}`
    );

    if (!summary) return null;

    const db = getDatabase();
    const id = uuid();
    db.prepare(
      'INSERT INTO conversation_summaries (id, session_id, summary, message_range_start, message_range_end, message_count) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, sessionId, summary, toSummarize[0].id, toSummarize[toSummarize.length - 1].id, toSummarize.length);

    return summary;
  }

  buildContextWithSummary(sessionId: string, recentMessages: { id: string; role: string; content: string }[]): { summary: string | null; messages: { role: string; content: string }[] } {
    const summaries = this.getSessionSummaries(sessionId);

    if (summaries.length === 0) {
      return { summary: null, messages: recentMessages };
    }

    const combinedSummary = summaries.map(s => s.summary).join('\n\n');
    return { summary: combinedSummary, messages: recentMessages };
  }

  /* ───── Auto-extraction from conversations ───── */

  async extractMemories(workspacePath: string, messages: { role: string; content: string }[], sessionId?: string): Promise<MemoryEntry[]> {
    if (messages.length < 2) return [];

    const conversationText = messages
      .slice(-20)
      .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 800)}`)
      .join('\n\n');

    const result = await this.callLLM(
      EXTRACTION_PROMPT,
      `Workspace: ${workspacePath}\n\nConversation:\n\n${conversationText}`
    );

    if (!result) return [];

    let candidates: { category: MemoryCategory; content: string }[];
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      candidates = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(candidates)) return [];
    } catch {
      return [];
    }

    const created: MemoryEntry[] = [];
    const existing = sessionId
      ? this.listBySession(sessionId)
      : this.listExact(workspacePath);

    for (const candidate of candidates) {
      if (!candidate.content || candidate.content.length < 5) continue;
      const cat = (['semantic', 'episodic', 'procedural'] as const).includes(candidate.category as any)
        ? candidate.category as MemoryCategory
        : 'semantic';

      const duplicate = await this.checkDuplicate(existing, candidate.content);
      if (duplicate === 'SKIP') continue;

      if (duplicate === 'UPDATE') {
        const match = existing.find(e => e.category === cat);
        if (match) {
          this.update(match.id, candidate.content, cat);
          continue;
        }
      }

      const entry = this.create(workspacePath, cat, candidate.content, 'auto', sessionId);
      created.push(entry);
      existing.push(entry);
    }

    return created;
  }

  private async checkDuplicate(existing: MemoryEntry[], newContent: string): Promise<'KEEP_BOTH' | 'UPDATE' | 'SKIP'> {
    if (existing.length === 0) return 'KEEP_BOTH';

    const similar = existing.filter(e => {
      const words1 = new Set(e.content.toLowerCase().split(/\s+/));
      const words2 = new Set(newContent.toLowerCase().split(/\s+/));
      const intersection = [...words1].filter(w => words2.has(w));
      const union = new Set([...words1, ...words2]);
      return intersection.length / union.size > 0.4;
    });

    if (similar.length === 0) return 'KEEP_BOTH';

    const existingText = similar.map(e => `- ${e.content}`).join('\n');
    const result = await this.callLLM(
      MEMORY_DEDUP_PROMPT,
      `Existing memory:\n${existingText}\n\nNew candidate:\n- ${newContent}`
    );

    if (!result) return 'KEEP_BOTH';
    const action = result.trim().toUpperCase();
    if (action.includes('SKIP')) return 'SKIP';
    if (action.includes('UPDATE')) return 'UPDATE';
    return 'KEEP_BOTH';
  }

  /* ───── LLM helper ───── */

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
    const config = LLMAgent.loadConfig();
    if (!config || !config.apiKey) return null;

    try {
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
          ...LLMAgent.maxTokensParam(config, 1024),
          temperature: 0.3,
          stream: false,
        }),
      });

      if (!response.ok) return null;
      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }

  /* ───── Row mappers ───── */

  private mapRow(row: any): MemoryEntry {
    return {
      id: row.id,
      workspacePath: row.workspace_path,
      sessionId: row.session_id || null,
      category: row.category,
      content: row.content,
      source: row.source,
      relevance: row.relevance,
      accessCount: row.access_count,
      lastAccessed: row.last_accessed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSummaryRow(row: any): ConversationSummary {
    return {
      id: row.id,
      sessionId: row.session_id,
      summary: row.summary,
      messageRangeStart: row.message_range_start,
      messageRangeEnd: row.message_range_end,
      messageCount: row.message_count,
      createdAt: row.created_at,
    };
  }
}
