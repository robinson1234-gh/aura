# Technical Design Document (TDD)
## WorkAgent - AI Agent Chat Platform

**Version:** 1.0  
**Date:** 2026-03-07  
**Covers:** All Functional Requirements from FRD v1.0  

---

## 1. Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React 18 + TypeScript | Component-based, strong typing, large ecosystem |
| UI Framework | Tailwind CSS + shadcn/ui | Rapid styling, accessible components |
| State Management | Zustand | Lightweight, minimal boilerplate |
| Markdown | react-markdown + remark-gfm | Full GFM support, extensible plugins |
| Code Highlighting | Prism.js (react-syntax-highlighter) | Language coverage, theme support |
| Backend | Node.js + Express + TypeScript | Unified language stack, async I/O |
| WebSocket | ws (npm package) | Lightweight, production-ready |
| Database | SQLite via better-sqlite3 | Zero-config, single-file, fast |
| Process Mgmt | Node child_process | Native, no extra dependencies |
| Build Tool | Vite | Fast HMR, ES modules |
| Package Manager | npm | Standard, widely available |

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Chrome)                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    React SPA (Vite)                      │ │
│  │  ┌──────────┐  ┌────────────────┐  ┌────────────────┐  │ │
│  │  │Workspace │  │   Chat Panel   │  │  Config Panel   │  │ │
│  │  │Navigator │  │  (Messages)    │  │  (Skills/Soul)  │  │ │
│  │  └──────────┘  └────────────────┘  └────────────────┘  │ │
│  │              ↕ WebSocket + REST API                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           │
                    HTTP :3001 / WS :3001
                           │
┌──────────────────────────────────────────────────────────────┐
│                    Gateway Server (Node.js)                   │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  REST API │  │ WS Gateway   │  │  Session Manager    │   │
│  │ (Express) │  │ (ws)         │  │  (Memory + Config)  │   │
│  └──────────┘  └──────────────┘  └─────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Agent Bridge (Plugin System)              │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ CursorAgent │  │ Future Agent │  │  Tool Agent │  │   │
│  │  │ (CLI spawn) │  │  (Plugin)    │  │  (Plugin)   │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────┐  ┌────────────────┐                           │
│  │  SQLite  │  │ File Storage   │                           │
│  │  (DB)    │  │ (~/.workagent) │                           │
│  └──────────┘  └────────────────┘                           │
└──────────────────────────────────────────────────────────────┘
                           │
                    child_process / stdin/stdout
                           │
┌──────────────────────────────────────────────────────────────┐
│                    Cursor IDE (Local)                         │
│  cursor agent -p "..." --output-format stream-json           │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Component Design

### 3.1 Frontend Components

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx          # Main 3-panel layout
│   │   ├── Sidebar.tsx            # Left sidebar container
│   │   └── Header.tsx             # Top bar with status
│   ├── workspace/
│   │   ├── WorkspaceTree.tsx      # Hierarchical tree view
│   │   ├── WorkspaceNode.tsx      # Single tree node
│   │   └── WorkspaceDialog.tsx    # Create/edit workspace modal
│   ├── chat/
│   │   ├── ChatPanel.tsx          # Main chat area
│   │   ├── MessageList.tsx        # Scrollable message list
│   │   ├── MessageBubble.tsx      # Individual message
│   │   ├── MessageInput.tsx       # Input area with toolbar
│   │   ├── StreamingMessage.tsx   # Live streaming display
│   │   └── CodeBlock.tsx          # Syntax-highlighted code
│   ├── session/
│   │   ├── SessionList.tsx        # Chat session list
│   │   └── SessionItem.tsx        # Single session entry
│   ├── config/
│   │   ├── ConfigPanel.tsx        # Right panel for config
│   │   ├── SkillEditor.tsx        # Edit SKILL.md
│   │   └── SoulEditor.tsx         # Edit SOUL.md
│   └── common/
│       ├── StatusIndicator.tsx    # Agent status dot
│       ├── ThemeToggle.tsx        # Dark/light switch
│       └── FileUpload.tsx         # File upload component
├── stores/
│   ├── workspaceStore.ts          # Workspace state
│   ├── sessionStore.ts            # Session/message state
│   ├── socketStore.ts             # WebSocket connection state
│   └── configStore.ts             # Config/theme state
├── services/
│   ├── api.ts                     # REST API client
│   ├── socket.ts                  # WebSocket client
│   └── markdown.ts                # Markdown renderer config
├── types/
│   └── index.ts                   # Shared TypeScript types
├── App.tsx
└── main.tsx
```

### 3.2 Backend Components

```
server/
├── src/
│   ├── index.ts                   # Entry point
│   ├── gateway/
│   │   ├── httpServer.ts          # Express app setup
│   │   ├── wsServer.ts            # WebSocket server
│   │   └── routes/
│   │       ├── workspaces.ts      # Workspace CRUD routes
│   │       ├── sessions.ts        # Session CRUD routes
│   │       ├── messages.ts        # Message routes
│   │       ├── files.ts           # File upload routes
│   │       └── config.ts          # Config routes
│   ├── agents/
│   │   ├── AgentBridge.ts         # Plugin manager
│   │   ├── BaseAgent.ts           # Agent interface
│   │   └── CursorAgent.ts         # Cursor CLI integration
│   ├── services/
│   │   ├── SessionService.ts      # Session business logic
│   │   ├── WorkspaceService.ts    # Workspace business logic
│   │   ├── ConfigService.ts       # Config inheritance logic
│   │   └── MessageService.ts      # Message persistence
│   ├── db/
│   │   ├── database.ts            # SQLite connection
│   │   ├── migrations.ts          # Schema migrations
│   │   └── models.ts              # DB models
│   └── types/
│       └── index.ts               # Backend types
├── package.json
└── tsconfig.json
```

---

## 4. Data Model

### 4.1 Database Schema (SQLite)

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES workspaces(id),
  path TEXT NOT NULL UNIQUE,      -- e.g., "tech/project/project1"
  level TEXT NOT NULL,             -- "domain", "category", "project"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL DEFAULT 'New Chat',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,              -- "user", "assistant", "system"
  content TEXT NOT NULL,
  metadata TEXT,                   -- JSON: tool calls, attachments, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  filename TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_workspaces_path ON workspaces(path);
```

### 4.2 File Storage Structure

```
~/.workagent/
├── data/
│   └── workagent.db               # SQLite database
├── files/                         # Uploaded files
│   └── <session_id>/
│       └── <file_id>_<filename>
├── workspaces/                    # Workspace configs
│   ├── tech/
│   │   ├── config.json
│   │   ├── SKILL.md
│   │   ├── SOUL.md
│   │   ├── project/
│   │   │   ├── SKILL.md
│   │   │   ├── project1/
│   │   │   │   ├── SKILL.md
│   │   │   │   └── SOUL.md
│   │   │   └── project2/
│   │   └── research/
│   └── dataanalysis/
│       ├── SKILL.md
│       └── EDA/
│           ├── customer1/
│           └── customer2/
└── plugins/                       # Plugin configs
    └── plugins.json
```

---

## 5. API Protocol Design

### 5.1 WebSocket Protocol

**Connection:** `ws://localhost:3001/ws`

**Client → Server Messages:**

```typescript
// Send chat message
{
  type: "chat.send",
  payload: {
    sessionId: string,
    content: string,
    attachments?: string[]  // file IDs
  }
}

// Cancel current operation
{
  type: "chat.cancel",
  payload: { sessionId: string }
}

// Subscribe to session
{
  type: "session.subscribe",
  payload: { sessionId: string }
}
```

**Server → Client Messages:**

```typescript
// Streaming response chunk
{
  type: "chat.stream",
  payload: {
    sessionId: string,
    delta: string,
    messageId: string
  }
}

// Complete response
{
  type: "chat.complete",
  payload: {
    sessionId: string,
    messageId: string,
    content: string,
    metadata?: object
  }
}

// Agent status change
{
  type: "agent.status",
  payload: {
    sessionId: string,
    status: "idle" | "thinking" | "executing" | "error",
    detail?: string
  }
}

// Error
{
  type: "error",
  payload: {
    code: string,
    message: string,
    sessionId?: string
  }
}
```

---

## 6. Cursor Agent Integration

### 6.1 Execution Flow

```
User message → Gateway → Agent Bridge → CursorAgent
                                            │
                                    Spawn child process:
                                    cursor -p "<prompt>" 
                                      --output-format stream-json
                                            │
                                    Parse NDJSON stream
                                            │
                                    Forward chunks to Gateway
                                            │
                              Gateway → WebSocket → UI (streaming)
```

### 6.2 Prompt Construction

The CursorAgent builds prompts by combining:
1. **Soul** - Persona/behavior instructions (from workspace hierarchy)
2. **Skills** - Capability instructions (merged from all ancestor levels)
3. **Context** - Last N messages from session memory
4. **User Message** - Current user input

```
[SOUL]
{merged soul content}

[SKILLS]
{merged skills content}

[CONVERSATION HISTORY]
{last N messages}

[USER]
{current message}
```

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Command injection | Sanitize all user input before passing to CLI |
| File access | Restrict file operations to workspace directories |
| DoS | Rate limit WebSocket messages (100/min) |
| Process runaway | Timeout agent processes (5 min default) |
| Data exposure | Local-only access, bind to localhost |

---

## 8. Error Handling Strategy

| Layer | Strategy |
|-------|---------|
| Frontend | Toast notifications for errors, retry for network issues |
| WebSocket | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) |
| REST API | Standard HTTP status codes, JSON error responses |
| Agent | Timeout + graceful kill, error forwarded to UI |
| Database | WAL mode for concurrent reads, transaction wrapping |
