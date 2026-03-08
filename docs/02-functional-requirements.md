# Functional Requirements Document (FRD)
## WorkAgent - AI Agent Chat Platform

**Version:** 1.0  
**Date:** 2026-03-07  
**Covers:** All Business Requirements from BRD v1.0  

---

## 1. System Overview

WorkAgent consists of three main subsystems:
1. **Chat UI** - React-based SPA served in browser
2. **Gateway Server** - Node.js backend with WebSocket + REST API
3. **Agent Bridge** - Process manager that interfaces with Cursor CLI and future tools

---

## 2. Functional Requirements

### 2.1 Chat Interface Module

#### FR-F01: Message Composition & Sending
- **Input:** Text area with multi-line support (Shift+Enter for newline, Enter to send)
- **Processing:** Message is sent via WebSocket to Gateway with workspace context
- **Output:** Message appears in chat with sender indicator
- **Validation:** Empty messages are rejected; max length 50,000 characters
- **Covers:** BR-F01, BR-F02

#### FR-F02: Message Display & Rendering
- **Input:** Message payload from WebSocket (streamed or complete)
- **Processing:** 
  - Parse markdown using marked/remark
  - Syntax highlight code blocks (highlight.js / Prism)
  - Render inline images via `<img>` tags
  - Render LaTeX math expressions
  - Detect and render Mermaid diagrams
- **Output:** Rich formatted message in chat panel
- **Covers:** BR-F03, BR-F04

#### FR-F03: Streaming Response Display
- **Input:** SSE/WebSocket stream events with partial content
- **Processing:** Append token-by-token to current message bubble
- **Output:** Typewriter-effect message rendering with cursor indicator
- **Covers:** BR-F02

#### FR-F04: Workspace Navigator
- **Input:** Hierarchical workspace tree data from API
- **Processing:** 
  - Render collapsible tree view in left sidebar
  - Support CRUD operations: create/rename/delete at each level
  - Display chat count per workspace node
  - Highlight active workspace
- **Output:** Interactive sidebar navigation
- **Operations:**
  - `POST /api/workspaces` - Create workspace node
  - `PUT /api/workspaces/:id` - Rename workspace
  - `DELETE /api/workspaces/:id` - Delete workspace (with confirmation)
  - `GET /api/workspaces` - List all workspaces as tree
- **Covers:** BR-F05

#### FR-F05: Session Management
- **Input:** User actions (new chat, select chat, rename, delete)
- **Processing:**
  - Create new session within current workspace
  - Load session history from backend
  - Persist active session selection
- **Output:** Chat panel updates with selected session
- **Operations:**
  - `POST /api/sessions` - Create session in workspace
  - `GET /api/sessions?workspace=path` - List sessions for workspace
  - `GET /api/sessions/:id/messages` - Load message history
  - `PUT /api/sessions/:id` - Update session metadata
  - `DELETE /api/sessions/:id` - Delete session
- **Covers:** BR-F06

#### FR-F06: Agent Status Display
- **States:**
  - `idle` - Green dot, "Ready"
  - `thinking` - Yellow pulse, "Thinking..."
  - `executing` - Blue spinner, "Executing..."
  - `error` - Red dot, "Error" with details
- **Events:** Status updates received via WebSocket `agent.status` events
- **Covers:** BR-F07

#### FR-F07: Theme System
- **Implementation:** CSS variables with theme tokens
- **Themes:** Light (default), Dark
- **Persistence:** Theme choice saved to localStorage
- **Covers:** BR-F08

#### FR-F08: File Upload
- **Input:** Drag-and-drop or file picker
- **Processing:** Upload to `POST /api/files` with multipart form data
- **Output:** File reference inserted into message, preview for images
- **Limits:** Max 10MB per file, max 5 files per message
- **Covers:** BR-F04

---

### 2.2 Gateway Server Module

#### FR-B01: WebSocket Gateway
- **Endpoint:** `ws://localhost:3001/ws`
- **Protocol:**
  - Client connects with session token
  - Server sends `connected` event with session info
  - Bidirectional JSON messages:
    ```
    Client -> Server: { type: "chat.send", sessionId, content, attachments? }
    Server -> Client: { type: "chat.stream", sessionId, delta, status }
    Server -> Client: { type: "chat.complete", sessionId, messageId, content }
    Server -> Client: { type: "agent.status", status, detail? }
    Server -> Client: { type: "error", code, message }
    ```
- **Covers:** BR-B02

#### FR-B02: REST API
- **Base URL:** `http://localhost:3001/api`
- **Endpoints:**
  | Method | Path | Description |
  |--------|------|-------------|
  | GET | /workspaces | List workspace tree |
  | POST | /workspaces | Create workspace node |
  | PUT | /workspaces/:id | Update workspace |
  | DELETE | /workspaces/:id | Delete workspace |
  | GET | /sessions | List sessions (query by workspace) |
  | POST | /sessions | Create session |
  | GET | /sessions/:id | Get session detail |
  | PUT | /sessions/:id | Update session |
  | DELETE | /sessions/:id | Delete session |
  | GET | /sessions/:id/messages | Get message history |
  | POST | /files | Upload file |
  | GET | /files/:id | Download file |
  | GET | /skills | List available skills |
  | PUT | /skills/:path | Update skill config |
  | GET | /config/:path | Get workspace config (soul, skills) |
  | PUT | /config/:path | Update workspace config |
- **Covers:** BR-B03

#### FR-B03: Cursor Agent Bridge
- **Invocation:** Spawn Cursor CLI process via `child_process`
  ```
  cursor agent -p "<prompt>" --output-format stream-json
  ```
- **Stream Handling:** Parse NDJSON output line-by-line
- **Response Types:**
  - `text` - Forward as chat.stream to client
  - `tool_call` - Log and display as collapsible action block
  - `tool_result` - Include in conversation context
  - `error` - Forward as error event
- **Process Management:**
  - Track active processes per session
  - Support cancellation via process kill
  - Timeout after configurable duration (default 5 minutes)
- **Covers:** BR-B01

#### FR-B04: Session Memory
- **Storage:** SQLite database at `~/.workagent/data/workagent.db`
- **Schema:**
  ```sql
  sessions(id, workspace_path, title, created_at, updated_at)
  messages(id, session_id, role, content, metadata, created_at)
  ```
- **Context Window:** Last N messages loaded as context for agent (configurable, default 20)
- **Covers:** BR-B04

#### FR-B05: Workspace Configuration
- **Storage:** File-based at `~/.workagent/workspaces/<path>/`
- **Files per workspace level:**
  - `config.json` - General settings
  - `SKILL.md` - Skills for this level (inherited by children)
  - `SOUL.md` - Persona/behavior for this level
- **Inheritance Resolution:**
  1. Load root-level config
  2. Merge domain-level config
  3. Merge category-level config
  4. Merge project-level config
  - Skills: additive (all ancestor skills apply)
  - Soul: deepest level wins, can `@extend` parent
- **Covers:** BR-B05, BR-B06, BR-O01-O05

#### FR-B06: Plugin System
- **Plugin Interface:**
  ```typescript
  interface AgentPlugin {
    name: string;
    description: string;
    execute(prompt: string, context: SessionContext): AsyncGenerator<StreamChunk>;
    healthCheck(): Promise<boolean>;
  }
  ```
- **Registration:** Plugins registered via config file at `~/.workagent/plugins/`
- **Selection:** Active plugin selected per workspace configuration
- **Default Plugin:** CursorAgent (built-in)
- **Covers:** BR-B07

---

### 2.3 Organization Module

#### FR-O01: Workspace Hierarchy
- **Structure:** Three-level tree: Domain > Category > Project
- **Examples:**
  ```
  tech/
    project/
      project1/   <- workspace with own session, skills, soul
      project2/
    research/
      poc-auth/
  dataanalysis/
    EDA/
      customer1/
      customer2/
    reporting/
      monthly/
  ```
- **Covers:** BR-O01, BR-O02, BR-O03

#### FR-O02: Configuration Inheritance
- **Example:**
  ```
  tech/SKILL.md           -> "You are a software engineer..."
  tech/project/SKILL.md   -> "Use TypeScript, follow clean architecture..."
  tech/project/project1/SKILL.md -> "This project uses React + FastAPI..."
  
  tech/SOUL.md            -> "Be concise, prefer code over explanation"
  tech/project/SOUL.md    -> (inherits from tech/SOUL.md)
  ```
- **Covers:** BR-O04, BR-O05

---

## 3. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Response latency (UI to first token) | < 2 seconds |
| NFR-2 | WebSocket reconnection on disconnect | Automatic with exponential backoff |
| NFR-3 | Message history load time | < 500ms for 100 messages |
| NFR-4 | Max concurrent sessions | 10 |
| NFR-5 | Data persistence | All data survives server restart |
| NFR-6 | Browser support | Chrome 100+, Firefox 100+, Edge 100+ |

---

## 4. Traceability Matrix

| Business Req | Functional Req(s) |
|-------------|-------------------|
| BR-F01 | FR-F01 |
| BR-F02 | FR-F01, FR-F03 |
| BR-F03 | FR-F02 |
| BR-F04 | FR-F02, FR-F08 |
| BR-F05 | FR-F04 |
| BR-F06 | FR-F05 |
| BR-F07 | FR-F06 |
| BR-F08 | FR-F07 |
| BR-B01 | FR-B03 |
| BR-B02 | FR-B01 |
| BR-B03 | FR-B02 |
| BR-B04 | FR-B04 |
| BR-B05 | FR-B05 |
| BR-B06 | FR-B05 |
| BR-B07 | FR-B06 |
| BR-O01-O05 | FR-O01, FR-O02 |
