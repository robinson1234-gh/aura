import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/database.js';
import type { Session } from '../types/index.js';

export class SessionService {
  listByWorkspace(workspaceId: string): Session[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM sessions WHERE workspace_id = ? ORDER BY updated_at DESC'
    ).all(workspaceId) as any[];

    return rows.map(this.mapRow);
  }

  getById(id: string): Session | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  create(workspaceId: string, title?: string, workingDirectory?: string): Session {
    const db = getDatabase();
    const id = uuid();
    db.prepare(
      'INSERT INTO sessions (id, workspace_id, title, working_directory) VALUES (?, ?, ?, ?)'
    ).run(id, workspaceId, title || 'New Chat', workingDirectory || null);

    return this.getById(id)!;
  }

  update(id: string, data: Partial<Pick<Session, 'title' | 'isActive' | 'workingDirectory'>>): Session {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error(`Session not found: ${id}`);

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.workingDirectory !== undefined) {
      updates.push('working_directory = ?');
      params.push(data.workingDirectory || null);
    }

    params.push(id);
    db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  private mapRow(row: any): Session {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      workingDirectory: row.working_directory || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
