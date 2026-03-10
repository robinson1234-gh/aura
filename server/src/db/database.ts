import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const DATA_DIR = path.join(os.homedir(), '.workagent', 'data');
const DB_PATH = path.join(DATA_DIR, 'workagent.db');

/**
 * Thin wrapper that exposes a better-sqlite3-compatible synchronous API
 * on top of sql.js (pure-JS SQLite, no native compilation needed).
 */
class DatabaseWrapper {
  constructor(private db: SqlJsDatabase) {}

  /** Run raw SQL (multiple statements). */
  exec(sql: string): void {
    this.db.run(sql);
  }

  /** Set a PRAGMA value. */
  pragma(pragma: string): void {
    this.db.run(`PRAGMA ${pragma}`);
  }

  /** Return a statement helper that supports .all(), .get(), .run(). */
  prepare(sql: string) {
    const db = this.db;

    return {
      all(...params: any[]): any[] {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows: any[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },

      get(...params: any[]): any | undefined {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        let row: any = undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      },

      run(...params: any[]): void {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        stmt.step();
        stmt.free();
        save();
      },
    };
  }

  /** Emulate better-sqlite3's transaction() helper. */
  transaction<T>(fn: () => T): () => T {
    const db = this.db;
    return () => {
      db.run('BEGIN');
      try {
        const result = fn();
        db.run('COMMIT');
        save();
        return result;
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    };
  }

  close(): void {
    save();
    this.db.close();
  }
}

let wrapper: DatabaseWrapper | null = null;
let rawDb: SqlJsDatabase | null = null;

function save(): void {
  if (!rawDb) return;
  try {
    const data = rawDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch {
    // ignore save errors during shutdown
  }
}

export function getDatabase(): DatabaseWrapper {
  if (!wrapper) {
    throw new Error('Database not initialised – call initDatabase() first');
  }
  return wrapper;
}

export async function initDatabase(): Promise<DatabaseWrapper> {
  if (wrapper) return wrapper;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  wrapper = new DatabaseWrapper(rawDb);
  wrapper.pragma('foreign_keys = ON');
  runMigrations(wrapper);
  save();
  return wrapper;
}

function runMigrations(db: DatabaseWrapper): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      path TEXT NOT NULL UNIQUE,
      level TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      working_directory TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_workspaces_path ON workspaces(path);
    CREATE INDEX IF NOT EXISTS idx_workspaces_parent ON workspaces(parent_id);
  `);

  try {
    db.exec('ALTER TABLE sessions ADD COLUMN working_directory TEXT');
  } catch {
    // column already exists
  }

  // Memories table for long-term agent memory (session-scoped)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      workspace_path TEXT NOT NULL,
      session_id TEXT,
      category TEXT NOT NULL DEFAULT 'semantic',
      content TEXT NOT NULL,
      source TEXT DEFAULT 'auto',
      relevance REAL DEFAULT 1.0,
      access_count INTEGER DEFAULT 0,
      last_accessed DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_memories_workspace ON memories(workspace_path);
    CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  `);

  // Migration: add session_id column if missing (for existing databases)
  try {
    db.exec('ALTER TABLE memories ADD COLUMN session_id TEXT');
  } catch {
    // column already exists
  }

  // Create session index after ensuring the column exists
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id)');
  } catch {
    // index already exists or column not available
  }

  // Conversation summaries table for session history compression
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_summaries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      message_range_start TEXT NOT NULL,
      message_range_end TEXT NOT NULL,
      message_count INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_summaries_session ON conversation_summaries(session_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'llm',
      description TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      config TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
  `);

  // Remove CHECK constraint on workspaces.level for dynamic nesting
  try {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='workspaces'").get() as any;
    if (row?.sql && row.sql.includes("CHECK(level IN")) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS workspaces_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          parent_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
          path TEXT NOT NULL UNIQUE,
          level TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO workspaces_new SELECT * FROM workspaces;
        DROP TABLE workspaces;
        ALTER TABLE workspaces_new RENAME TO workspaces;
        CREATE INDEX IF NOT EXISTS idx_workspaces_path ON workspaces(path);
        CREATE INDEX IF NOT EXISTS idx_workspaces_parent ON workspaces(parent_id);
      `);
    }
  } catch {
    // migration already applied or not needed
  }
}

export function closeDatabase(): void {
  if (wrapper) {
    wrapper.close();
    wrapper = null;
    rawDb = null;
  }
}
