# WorkAgent

AI Agent Chat Platform — Browser-based chat interface for orchestrating AI agents (Cursor IDE and more).

Inspired by [OpenClaw](https://github.com/openclaw/openclaw)'s architecture: Gateway-Bridge-Agent pattern with hierarchical workspace management, session memory, and extensible plugin system.

---

## Features

- **Browser-based Chat UI** — Modern React interface with real-time streaming, markdown rendering, syntax-highlighted code blocks
- **Cursor IDE Integration** — Send tasks to Cursor CLI agent and receive streaming responses
- **Hierarchical Workspaces** — Organize work by domain/category/project (e.g., `tech/project/project1`)
- **Skills & Soul System** — Configure agent behavior per workspace level with inheritance
- **Session Memory** — Persistent conversation history per workspace
- **Plugin Architecture** — Extensible agent system for adding new tools and LLMs
- **Dark/Light Theme** — System-aware with manual toggle

## Architecture

```
Browser (React SPA)
    ↕ WebSocket + REST
Gateway Server (Node.js + Express)
    ↕ Plugin System
Agent Bridge → CursorAgent (CLI spawn)
    ↕
SQLite DB + File Config Storage
```

## Quick Start

### Prerequisites

- Node.js >= 18
- Cursor IDE (optional, for agent execution)

### Setup

```powershell
# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

# Or manually
npm run install:all
```

### Run

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Run Tests

```powershell
# Start the server first, then in another terminal:
powershell -ExecutionPolicy Bypass -File scripts/test-integration.ps1
```

## Project Structure

```
WorkAgent/
├── docs/                          # Requirements & design documents
│   ├── 01-business-requirements.md
│   ├── 02-functional-requirements.md
│   ├── 03-technical-design.md
│   ├── 04-solution-architecture.md
│   └── 05-user-guide.md
├── client/                        # React frontend (Vite)
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── layout/            # AppLayout, Sidebar, Header
│   │   │   ├── workspace/         # WorkspaceTree
│   │   │   ├── chat/              # ChatPanel, MessageBubble, Input
│   │   │   ├── session/           # SessionList
│   │   │   ├── config/            # ConfigPanel (Skills/Soul editor)
│   │   │   └── common/            # StatusIndicator, ThemeToggle
│   │   ├── stores/                # Zustand state management
│   │   ├── services/              # API client, WebSocket service
│   │   └── types/                 # TypeScript interfaces
│   └── package.json
├── server/                        # Node.js backend
│   ├── src/
│   │   ├── gateway/               # HTTP + WebSocket servers
│   │   │   ├── routes/            # REST API endpoints
│   │   │   ├── httpServer.ts      # Express app
│   │   │   └── wsServer.ts        # WebSocket handler
│   │   ├── agents/                # Agent plugin system
│   │   │   ├── AgentBridge.ts     # Plugin manager
│   │   │   ├── BaseAgent.ts       # Abstract agent
│   │   │   └── CursorAgent.ts     # Cursor CLI integration
│   │   ├── services/              # Business logic
│   │   │   ├── WorkspaceService   # Workspace CRUD + hierarchy
│   │   │   ├── SessionService     # Chat session management
│   │   │   ├── MessageService     # Message persistence
│   │   │   └── ConfigService      # Skill/Soul inheritance
│   │   └── db/                    # SQLite database
│   └── package.json
├── scripts/                       # Setup and test scripts
├── package.json                   # Root workspace
└── README.md
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, Express, WebSocket (ws), SQLite (better-sqlite3) |
| Agent | Cursor CLI (child_process spawn with NDJSON streaming) |
| Rendering | react-markdown, remark-gfm, react-syntax-highlighter |

## Configuration

### Workspace Hierarchy

```
tech/                    # Domain
  ├── SKILL.md           # "You are a software engineer..."
  ├── SOUL.md            # "Be concise, prefer code..."
  ├── project/           # Category
  │   ├── SKILL.md       # "Use TypeScript, clean architecture..."
  │   ├── project1/      # Project
  │   │   └── SKILL.md   # "React + Express, SQLite DB..."
  │   └── project2/
  └── research/
dataanalysis/
  ├── SKILL.md           # "You are a data analyst..."
  └── EDA/
      └── customer1/
```

### Inheritance Rules

- **Skills**: Additive — all ancestor skills are combined
- **Soul**: Override — deepest level wins (use `@extend` to append to parent)

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/workspaces | List workspace tree |
| POST | /api/workspaces | Create workspace |
| PUT | /api/workspaces/:id | Rename workspace |
| DELETE | /api/workspaces/:id | Delete workspace (cascade) |
| GET | /api/sessions?workspaceId=X | List sessions |
| POST | /api/sessions | Create session |
| GET | /api/sessions/:id/messages | Get message history |
| GET | /api/config/resolve/:path | Get resolved config |
| GET/PUT | /api/config/skill/:path | Get/set skill content |
| GET/PUT | /api/config/soul/:path | Get/set soul content |
| GET | /api/health | Health check |
| GET | /api/agents | List available agents |

### WebSocket Protocol

Connect to `ws://localhost:3001/ws`

**Send:** `{ type: "chat.send", payload: { sessionId, content } }`
**Receive:** `{ type: "chat.stream", payload: { sessionId, delta, messageId } }`

## Roadmap

- [ ] LLM API direct integration (OpenAI, Anthropic)
- [ ] File upload and attachment support
- [ ] MCP server integration
- [ ] Multi-user authentication
- [ ] Voice interface
- [ ] Autonomous heartbeat/cron tasks
- [ ] Mobile responsive improvements

## License

MIT
