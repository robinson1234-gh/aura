# Solution Architecture Document
## WorkAgent - AI Agent Chat Platform

**Version:** 1.0  
**Date:** 2026-03-07  

---

## 1. Architecture Overview

WorkAgent follows a **Gateway-Bridge-Agent** pattern inspired by OpenClaw's architecture, adapted for a browser-to-Cursor workflow.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              React SPA (Vite + TypeScript)                     │  │
│  │                                                                │  │
│  │  ┌─────────┐ ┌──────────────────────────┐ ┌───────────────┐   │  │
│  │  │Workspace│ │      Chat Panel          │ │  Config Panel  │   │  │
│  │  │  Tree   │ │  ┌────────────────────┐  │ │  ┌─────────┐  │   │  │
│  │  │         │ │  │  Message Stream    │  │ │  │  Skills  │  │   │  │
│  │  │ Domain  │ │  │  (Markdown/Code)   │  │ │  │  Editor  │  │   │  │
│  │  │  ├Cat   │ │  └────────────────────┘  │ │  ├─────────┤  │   │  │
│  │  │  │├Proj │ │  ┌────────────────────┐  │ │  │  Soul    │  │   │  │
│  │  │  ││     │ │  │  Input + Upload    │  │ │  │  Editor  │  │   │  │
│  │  │  Sessions │  └────────────────────┘  │ │  └─────────┘  │   │  │
│  │  └─────────┘ └──────────────────────────┘ └───────────────┘   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                    │ WebSocket │ REST (HTTP)                          │
└────────────────────┼──────────┼──────────────────────────────────────┘
                     │          │
          localhost:3001        │
                     │          │
┌────────────────────┼──────────┼──────────────────────────────────────┐
│                    │  GATEWAY LAYER                                   │
│                    ▼          ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Express + WebSocket Server                      │    │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │    │
│  │  │ REST Router│  │ WS Handler  │  │ Middleware Pipeline   │  │    │
│  │  │            │  │             │  │ (CORS, Validation,   │  │    │
│  │  │ /api/*     │  │ Connection  │  │  Error Handling)     │  │    │
│  │  │            │  │ Manager     │  │                      │  │    │
│  │  └─────┬──────┘  └──────┬──────┘  └──────────────────────┘  │    │
│  └────────┼────────────────┼────────────────────────────────────┘    │
│           │                │                                         │
│           ▼                ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    SERVICE LAYER                              │    │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐    │    │
│  │  │ Workspace   │ │  Session     │ │  Config            │    │    │
│  │  │ Service     │ │  Service     │ │  Service           │    │    │
│  │  │             │ │              │ │  (Inheritance)     │    │    │
│  │  │ CRUD ops,   │ │ Memory,      │ │  Skill merging,   │    │    │
│  │  │ tree query  │ │ history      │ │  Soul resolution  │    │    │
│  │  └─────────────┘ └──────────────┘ └────────────────────┘    │    │
│  │  ┌──────────────────────────────────────────────────────┐    │    │
│  │  │              Message Service                          │    │    │
│  │  │  Store, retrieve, search messages                     │    │    │
│  │  └──────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    AGENT BRIDGE LAYER                         │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────────┐ │    │
│  │  │              Agent Bridge (Plugin Manager)               │ │    │
│  │  │  - Plugin registry & lifecycle                          │ │    │
│  │  │  - Prompt builder (soul + skills + context)             │ │    │
│  │  │  - Stream multiplexer                                   │ │    │
│  │  └───────────────┬─────────────────┬───────────────────────┘ │    │
│  │                  │                 │                           │    │
│  │    ┌─────────────▼───┐  ┌──────────▼──────────┐              │    │
│  │    │  CursorAgent    │  │  Future Agents      │              │    │
│  │    │                 │  │  (LLM API, MCP,     │              │    │
│  │    │  child_process  │  │   Custom tools)     │              │    │
│  │    │  spawn + NDJSON │  │                     │              │    │
│  │    └─────────────────┘  └─────────────────────┘              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    PERSISTENCE LAYER                          │    │
│  │  ┌────────────┐  ┌─────────────────┐  ┌─────────────────┐   │    │
│  │  │  SQLite DB │  │  File Storage   │  │  Workspace      │   │    │
│  │  │            │  │  (uploads)      │  │  Config Files   │   │    │
│  │  │  sessions  │  │                 │  │  SKILL.md       │   │    │
│  │  │  messages  │  │  ~/.workagent/  │  │  SOUL.md        │   │    │
│  │  │  workspaces│  │  files/         │  │  config.json    │   │    │
│  │  └────────────┘  └─────────────────┘  └─────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                     │
              child_process
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL TOOLS                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │  Cursor IDE CLI │  │  Future: LLM API │  │  Future: MCP     │    │
│  │  (Local)        │  │  (OpenAI, etc.)  │  │  Servers         │    │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagrams

### 2.1 Chat Message Flow

```
User types message
    │
    ▼
[React] MessageInput.onSubmit()
    │
    ├──► [Zustand] Add user message to store (optimistic)
    │
    └──► [WebSocket] Send { type: "chat.send", sessionId, content }
              │
              ▼
    [Gateway] wsServer receives message
              │
              ├──► [MessageService] Persist user message to SQLite
              │
              ├──► [ConfigService] Resolve skills + soul for workspace
              │
              ├──► [SessionService] Load last N messages as context
              │
              └──► [AgentBridge] Execute with resolved config
                        │
                        ├──► Build prompt (soul + skills + context + message)
                        │
                        └──► [CursorAgent] Spawn CLI process
                                  │
                                  ├──► Stream NDJSON chunks
                                  │       │
                                  │       ▼
                                  │    [Gateway] Forward as chat.stream
                                  │       │
                                  │       ▼
                                  │    [WebSocket] → [React] StreamingMessage
                                  │
                                  └──► Process complete
                                          │
                                          ▼
                                    [MessageService] Persist assistant message
                                          │
                                          ▼
                                    [Gateway] Send chat.complete
                                          │
                                          ▼
                                    [React] Finalize message display
```

### 2.2 Workspace Configuration Resolution

```
Request for workspace "tech/project/project1"
    │
    ▼
[ConfigService] resolveConfig("tech/project/project1")
    │
    ├──► Load tech/SKILL.md           → base skills
    ├──► Load tech/SOUL.md            → base soul  
    ├──► Load tech/project/SKILL.md   → merge into skills
    ├──► Load tech/project/SOUL.md    → override soul (if exists)
    ├──► Load tech/project/project1/SKILL.md → merge into skills
    └──► Load tech/project/project1/SOUL.md  → final soul (if exists)
    │
    ▼
Return {
  skills: [base + project + project1 skills],
  soul: deepest-level soul content
}
```

---

## 3. Component Interaction Matrix

| Component | Depends On | Communicates Via |
|-----------|-----------|-----------------|
| React SPA | Gateway Server | WebSocket + REST |
| REST Router | Service Layer | Function calls |
| WS Handler | Service Layer, Agent Bridge | Function calls |
| WorkspaceService | SQLite DB, File System | Direct access |
| SessionService | SQLite DB | Direct access |
| ConfigService | File System | File I/O |
| MessageService | SQLite DB | Direct access |
| AgentBridge | CursorAgent (plugins) | Plugin interface |
| CursorAgent | Cursor CLI | child_process spawn |

---

## 4. Deployment Architecture

```
Single Machine Deployment:
┌─────────────────────────────────────┐
│            User's Machine            │
│                                      │
│  ┌──────────────┐                   │
│  │   Chrome     │◄──── localhost    │
│  │   Browser    │      :5173 (dev)  │
│  └──────────────┘      :3001 (API) │
│                                      │
│  ┌──────────────┐                   │
│  │   Node.js    │                   │
│  │   Gateway    │ ◄── Port 3001    │
│  │   Server     │                   │
│  └──────┬───────┘                   │
│         │                            │
│  ┌──────▼───────┐                   │
│  │  Cursor IDE  │                   │
│  │  (CLI)       │                   │
│  └──────────────┘                   │
│                                      │
│  ┌──────────────┐                   │
│  │ ~/.workagent │                   │
│  │  (Data Dir)  │                   │
│  └──────────────┘                   │
└─────────────────────────────────────┘
```

---

## 5. Key Design Decisions

| Decision | Rationale | Alternatives Considered |
|----------|----------|----------------------|
| SQLite over PostgreSQL | Single-user, zero-config, portable | PostgreSQL (overkill for v1) |
| WebSocket over SSE | Bidirectional communication needed | SSE (one-way only) |
| child_process over HTTP | Cursor CLI is local-first | HTTP API (not available) |
| Zustand over Redux | Simpler API, less boilerplate | Redux (too verbose) |
| File-based config | Human-editable, git-friendly | DB-stored config |
| Monorepo structure | Shared types, simpler deployment | Separate repos |

---

## 6. Scalability Path

| Phase | Capability | Change Required |
|-------|-----------|----------------|
| v1.0 | Single user, local Cursor | Current architecture |
| v1.1 | Multiple agent plugins | Add plugin implementations |
| v1.2 | LLM API direct integration | Add OpenAI/Anthropic agent plugin |
| v2.0 | Multi-user support | Add auth layer, user isolation |
| v2.1 | Remote agent execution | Replace child_process with HTTP/gRPC |
| v3.0 | Cloud deployment | PostgreSQL, Redis, S3 storage |
