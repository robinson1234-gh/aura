export interface Workspace {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  level: string;
  createdAt: string;
  updatedAt: string;
  children?: Workspace[];
  sessionCount?: number;
}

export interface Session {
  id: string;
  workspaceId: string;
  title: string;
  workingDirectory?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  sessionId: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  createdAt: string;
}

export interface WorkspaceConfig {
  skills: string;
  soul: string;
  settings: Record<string, unknown>;
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentPlugin {
  name: string;
  description: string;
  execute(prompt: string, context: AgentContext): AsyncGenerator<StreamChunk>;
  cancel(sessionId: string): void;
  healthCheck(): Promise<boolean>;
}

export interface AgentContext {
  sessionId: string;
  workspacePath: string;
  skills: string;
  soul: string;
  history: Message[];
  workingDirectory?: string;
}

export type WSClientMessage =
  | { type: 'chat.send'; payload: { sessionId: string; content: string; attachments?: string[] } }
  | { type: 'chat.cancel'; payload: { sessionId: string } }
  | { type: 'session.subscribe'; payload: { sessionId: string } };

export type WSServerMessage =
  | { type: 'chat.stream'; payload: { sessionId: string; delta: string; messageId: string } }
  | { type: 'chat.complete'; payload: { sessionId: string; messageId: string; content: string; metadata?: Record<string, unknown> } }
  | { type: 'agent.status'; payload: { sessionId: string; status: AgentStatus; detail?: string } }
  | { type: 'chat.tool_call'; payload: { sessionId: string; messageId: string; toolCallId: string; toolName: string; arguments: string; status: string } }
  | { type: 'chat.tool_result'; payload: { sessionId: string; messageId: string; toolCallId: string; toolName: string; result: string } }
  | { type: 'error'; payload: { code: string; message: string; sessionId?: string } }
  | { type: 'connected'; payload: { message: string } };

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'error';
