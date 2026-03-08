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

export interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  arguments: string;
  status: 'running' | 'completed' | 'error';
  result?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
}

export interface WorkspaceConfig {
  skills: string;
  soul: string;
  settings: Record<string, unknown>;
}

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'error';

export type WSServerMessage =
  | { type: 'chat.stream'; payload: { sessionId: string; delta: string; messageId: string } }
  | { type: 'chat.complete'; payload: { sessionId: string; messageId: string; content: string; metadata?: Record<string, unknown> } }
  | { type: 'agent.status'; payload: { sessionId: string; status: AgentStatus; detail?: string } }
  | { type: 'chat.tool_call'; payload: { sessionId: string; messageId: string; toolCallId: string; toolName: string; arguments: string; status: string } }
  | { type: 'chat.tool_result'; payload: { sessionId: string; messageId: string; toolCallId: string; toolName: string; result: string } }
  | { type: 'error'; payload: { code: string; message: string; sessionId?: string } }
  | { type: 'connected'; payload: { message: string } };
