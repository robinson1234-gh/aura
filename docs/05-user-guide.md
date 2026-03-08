# WorkAgent User Guide

**Version:** 1.0  
**Date:** 2026-03-07  

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Interface Overview](#2-interface-overview)
3. [Workspace Management](#3-workspace-management)
4. [Chat Sessions](#4-chat-sessions)
5. [Sending Messages](#5-sending-messages)
6. [Skills & Soul Configuration](#6-skills--soul-configuration)
7. [Understanding the Agent](#7-understanding-the-agent)
8. [Keyboard Shortcuts](#8-keyboard-shortcuts)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Getting Started

### Prerequisites

- **Node.js 18+** — Download from [nodejs.org](https://nodejs.org/)
- **Cursor IDE** — Download from [cursor.com](https://cursor.com/) (optional, for agent execution)
- **Chrome/Edge/Firefox** — Any modern browser

### Installation

```bash
# 1. Navigate to the project directory
cd WorkAgent

# 2. Run the setup script (Windows)
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

# Or install manually
npm run install:all
```

### Starting the Application

```bash
# Start both backend and frontend in development mode
npm run dev
```

This starts:
- **Backend API** at `http://localhost:3001`
- **Frontend UI** at `http://localhost:5173`

Open your browser and navigate to `http://localhost:5173`.

---

## 2. Interface Overview

The WorkAgent interface has three main areas:

```
┌──────────┬─────────────────────────────┬───────────┐
│          │         Header Bar          │           │
│          │ (path, status, settings)    │           │
│  Side-   ├─────────────────────────────┤  Config   │
│  bar     │                             │  Panel    │
│          │       Chat Panel            │ (optional)│
│ Workspace│                             │           │
│   Tree   │  Messages appear here       │  Skills   │
│          │  with streaming support     │  & Soul   │
│  Chat    │                             │  editors  │
│  List    │                             │           │
│          ├─────────────────────────────┤           │
│          │      Input Area             │           │
└──────────┴─────────────────────────────┴───────────┘
```

### Header Bar
- **Workspace Path** — Shows the current workspace hierarchy
- **Session Title** — Name of the active chat
- **Status Indicator** — Shows agent state (Ready, Thinking, Executing, Error)
- **Settings Button** — Opens the configuration panel

### Sidebar
- **Workspace Tree** — Hierarchical view of all workspaces
- **Chat List** — Sessions within the selected workspace

### Chat Panel
- **Message List** — Conversation history with markdown rendering
- **Input Area** — Text input for sending messages to the agent

---

## 3. Workspace Management

Workspaces organize your work into a three-level hierarchy:

```
Domain (e.g., tech, dataanalysis)
  └── Category (e.g., project, EDA)
       └── Project (e.g., project1, customer1)
```

### Creating Workspaces

1. **New Domain** — Click the `+` button next to "Workspaces" heading
2. **New Category** — Hover over a domain, click the `+` button
3. **New Project** — Hover over a category, click the `+` button

Type the name and press `Enter` to create. Press `Escape` to cancel.

### Renaming

Hover over any workspace node and click the pencil icon. Edit the name and press `Enter`.

### Deleting

Hover over any workspace node and click the red trash icon. A confirmation dialog will appear.

> **Warning:** Deleting a workspace removes all its children and associated chat sessions.

### Selecting a Workspace

Click on a **project-level** workspace to select it. This loads the chat sessions for that project.

---

## 4. Chat Sessions

Each project workspace can have multiple chat sessions, each with its own conversation history.

### Creating a Chat

1. Select a project workspace
2. Click the `+` button next to "Chats" heading
3. A new "New Chat" session is created and selected

### Switching Chats

Click on any chat in the sidebar list to switch to it.

### Renaming a Chat

Hover over a chat and click the pencil icon. The title auto-updates to the first message content, but you can manually rename it.

### Deleting a Chat

Hover over a chat and click the red trash icon.

---

## 5. Sending Messages

### Composing

- Type your message in the input area at the bottom of the chat panel
- **Enter** — Send the message
- **Shift+Enter** — New line (multiline input)
- Click the **Send** button (blue arrow) to send

### Message Rendering

Messages support rich content:
- **Markdown** — Headers, bold, italic, lists, blockquotes
- **Code blocks** — Syntax-highlighted with copy button
- **Tables** — GFM table syntax
- **Links** — Clickable, open in new tab
- **Images** — Inline rendering

### Streaming Responses

Agent responses stream in real-time with a typing cursor indicator. You can see the response building character by character.

### Cancelling

While the agent is processing (status shows "Thinking..." or "Executing..."), click the red **Stop** button to cancel the current operation.

---

## 6. Skills & Soul Configuration

Each workspace level can have its own **Skills** and **Soul** configuration, which shape how the agent behaves.

### Opening Config Panel

Click the **Settings** (gear) icon in the header bar.

### Skills (SKILL.md)

Skills define *what* the agent can do and *how* it should approach tasks.

- Written in Markdown format
- **Inherited** — Skills at parent levels apply to all children (additive)
- Each level adds more specific instructions

**Example hierarchy:**
```
tech/SKILL.md:
  "You are a software engineer. Write clean code."

tech/project/SKILL.md:
  "Use TypeScript. Follow REST conventions."

tech/project/project1/SKILL.md:
  "This project uses React + Express. Database is SQLite."
```

When working in `tech/project/project1`, the agent receives ALL three skill sets combined.

### Soul (SOUL.md)

Soul defines the agent's *personality* and *behavior style*.

- Written in Markdown format
- **Overriding** — The deepest level's soul takes precedence
- Use `@extend` at the start to add to the parent soul instead of replacing it

**Example:**
```
tech/SOUL.md:
  "Be concise. Prefer code over explanation."

tech/project/project1/SOUL.md:
  "@extend
   Always include unit tests with examples."
```

### Viewing Resolved Config

The config panel shows both:
1. **This level** — The editable content for the current workspace
2. **Resolved (inherited)** — The final combined content after inheritance

---

## 7. Understanding the Agent

### Agent Status

| Status | Indicator | Meaning |
|--------|-----------|---------|
| Ready | Green dot | Agent is idle, ready for input |
| Thinking | Yellow pulse | Agent is processing your request |
| Executing | Blue pulse | Agent is running commands/tools |
| Error | Red dot | An error occurred |

### How It Works

1. You send a message
2. The backend resolves the workspace's skills + soul + conversation history
3. A prompt is constructed and sent to the Cursor CLI agent
4. The response streams back to the UI in real-time
5. The full response is saved to the session history

### Agent Fallback

If Cursor CLI is not available, the agent will return a message indicating it's not configured. You can:
- Install Cursor IDE and ensure the `cursor` CLI is in your PATH
- Or configure an alternative agent plugin in the future

---

## 8. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Escape` | Cancel editing (workspace/session name) |

---

## 9. Troubleshooting

### "Cannot connect to server"

- Ensure the backend is running (`npm run dev:server`)
- Check that port 3001 is not in use
- The WebSocket auto-reconnects with backoff

### "Agent not responding"

- Check the status indicator — if it shows "Error", there may be a Cursor CLI issue
- Verify Cursor IDE is installed: run `cursor --version` in terminal
- Check the server console for error logs

### "Workspace tree is empty"

- The first launch creates default workspaces (tech, dataanalysis)
- If the database was corrupted, delete `~/.workagent/data/workagent.db` and restart

### "Messages not loading"

- Try refreshing the page
- Switch to a different session and back
- Check browser console for errors

### Data Location

All data is stored at `~/.workagent/`:
```
~/.workagent/
├── data/workagent.db     # Database (sessions, messages, workspaces)
├── files/                # Uploaded files
└── workspaces/           # Skill/Soul configuration files
```

To reset everything, delete the `~/.workagent/` directory and restart the server.
