import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/database.js';
import type { Message } from '../types/index.js';

export class MessageService {
  listBySession(sessionId: string, limit = 100, offset = 0): Message[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?'
    ).all(sessionId, limit, offset) as any[];

    return rows.map(this.mapRow);
  }

  getRecentContext(sessionId: string, count = 20): Message[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?
      ) sub ORDER BY created_at ASC
    `).all(sessionId, count) as any[];

    return rows.map(this.mapRow);
  }

  create(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, unknown>): Message {
    const db = getDatabase();
    const id = uuid();
    db.prepare(
      'INSERT INTO messages (id, session_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)'
    ).run(id, sessionId, role, content, metadata ? JSON.stringify(metadata) : null);

    db.prepare('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);

    return this.getById(id)!;
  }

  getById(id: string): Message | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  deleteBySession(sessionId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
  }

  private mapRow(row: any): Message {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    };
  }
}
