import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/database.js';
import type { Workspace } from '../types/index.js';

export class WorkspaceService {
  getTree(): Workspace[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT w.*, (SELECT COUNT(*) FROM sessions s WHERE s.workspace_id = w.id) as session_count
      FROM workspaces w ORDER BY w.path
    `).all() as any[];

    const map = new Map<string, Workspace>();
    const roots: Workspace[] = [];

    for (const row of rows) {
      const workspace: Workspace = {
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        path: row.path,
        level: row.level,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        children: [],
        sessionCount: row.session_count,
      };
      map.set(workspace.id, workspace);
    }

    for (const ws of map.values()) {
      if (ws.parentId && map.has(ws.parentId)) {
        map.get(ws.parentId)!.children!.push(ws);
      } else {
        roots.push(ws);
      }
    }

    return roots;
  }

  getById(id: string): Workspace | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      path: row.path,
      level: row.level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getByPath(wsPath: string): Workspace | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM workspaces WHERE path = ?').get(wsPath) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      path: row.path,
      level: row.level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  hasChildren(id: string): boolean {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM workspaces WHERE parent_id = ?').get(id) as any;
    return row.cnt > 0;
  }

  create(name: string, parentId: string | null, level: string): Workspace {
    const db = getDatabase();
    const id = uuid();
    let wsPath: string;

    if (parentId) {
      const parent = this.getById(parentId);
      if (!parent) throw new Error(`Parent workspace not found: ${parentId}`);
      wsPath = `${parent.path}/${name}`;
    } else {
      wsPath = name;
    }

    const existing = this.getByPath(wsPath);
    if (existing) throw new Error(`Workspace already exists: ${wsPath}`);

    db.prepare(`
      INSERT INTO workspaces (id, name, parent_id, path, level) VALUES (?, ?, ?, ?, ?)
    `).run(id, name, parentId, wsPath, level);

    return this.getById(id)!;
  }

  update(id: string, name: string): Workspace {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error(`Workspace not found: ${id}`);

    const oldPath = existing.path;
    const parts = oldPath.split('/');
    parts[parts.length - 1] = name;
    const newPath = parts.join('/');

    const updateChildren = db.prepare(`
      UPDATE workspaces SET path = REPLACE(path, ?, ?) WHERE path LIKE ?
    `);

    db.transaction(() => {
      db.prepare('UPDATE workspaces SET name = ?, path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(name, newPath, id);
      updateChildren.run(oldPath + '/', newPath + '/', oldPath + '/%');
    })();

    return this.getById(id)!;
  }

  delete(id: string): void {
    if (this.hasChildren(id)) {
      throw new Error('Cannot delete a workspace that has children. Remove child workspaces first.');
    }
    const db = getDatabase();
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  }

  ensureDefaultWorkspaces(): void {
    const db = getDatabase();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM workspaces').get() as any).cnt;
    if (count > 0) return;

    const techId = this.create('tech', null, 'domain').id;
    const projectCatId = this.create('project', techId, 'category').id;
    this.create('project1', projectCatId, 'project');

    const dataId = this.create('dataanalysis', null, 'domain').id;
    const edaId = this.create('EDA', dataId, 'category').id;
    this.create('customer1', edaId, 'project');
  }
}
