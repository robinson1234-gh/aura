import { create } from 'zustand';
import type { Session, Message, AgentStatus, ToolCallInfo, TraceSpan } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socket';

export interface ChatState {
  messages: Message[];
  streamingContent: Map<string, string>;
  agentStatus: AgentStatus;
  agentStatusDetail: string;
  loaded: boolean;
}

function emptyChatState(): ChatState {
  return {
    messages: [],
    streamingContent: new Map(),
    agentStatus: 'idle',
    agentStatusDetail: '',
    loaded: false,
  };
}

interface SessionStoreState {
  sessions: Session[];
  activeSessionId: string | null;
  openSessionIds: string[];
  chatStates: Map<string, ChatState>;
  isLoading: boolean;
  error: string | null;

  // Computed helpers
  getActiveSession: () => Session | null;
  getChatState: (sessionId: string) => ChatState;

  // Session management
  fetchSessions: (workspaceId: string) => Promise<void>;
  setActiveSession: (session: Session | null) => Promise<void>;
  openSession: (session: Session) => Promise<void>;
  closeSession: (sessionId: string) => void;
  createSession: (workspaceId: string, title?: string, workingDirectory?: string) => Promise<Session>;
  updateSession: (id: string, data: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  // Chat operations (scoped by sessionId)
  sendMessage: (content: string, sessionId?: string) => void;
  cancelExecution: (sessionId?: string) => void;

  // WS message handlers (route by sessionId)
  appendStreamDelta: (sessionId: string, messageId: string, delta: string) => void;
  completeStream: (sessionId: string, messageId: string, content: string, metadata?: Record<string, unknown>) => void;
  setAgentStatus: (sessionId: string, status: AgentStatus, detail?: string) => void;
  addToolCall: (sessionId: string, messageId: string, toolCall: ToolCallInfo) => void;
  updateToolResult: (sessionId: string, messageId: string, toolCallId: string, result: string) => void;
  addTraceSpan: (sessionId: string, messageId: string, span: TraceSpan) => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  openSessionIds: [],
  chatStates: new Map(),
  isLoading: false,
  error: null,

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    return sessions.find(s => s.id === activeSessionId) || null;
  },

  getChatState: (sessionId) => {
    return get().chatStates.get(sessionId) || emptyChatState();
  },

  fetchSessions: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const sessions = await api.sessions.list(workspaceId);
      set({ sessions, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setActiveSession: async (session) => {
    if (!session) {
      set({ activeSessionId: null });
      return;
    }
    const prev = get().activeSessionId;
    if (prev === session.id) return;

    set({ activeSessionId: session.id });
    await get().openSession(session);
  },

  openSession: async (session) => {
    const { openSessionIds, chatStates } = get();
    const alreadyOpen = openSessionIds.includes(session.id);

    if (!alreadyOpen) {
      set({ openSessionIds: [...openSessionIds, session.id] });
    }

    const existing = chatStates.get(session.id);
    if (existing?.loaded) return;

    const newStates = new Map(get().chatStates);
    newStates.set(session.id, { ...emptyChatState(), loaded: false });
    set({ chatStates: newStates, isLoading: true });

    try {
      const messages = await api.sessions.messages(session.id);
      const states = new Map(get().chatStates);
      const current = states.get(session.id) || emptyChatState();
      states.set(session.id, { ...current, messages, loaded: true });
      set({ chatStates: states, isLoading: false });
      socketService.send({ type: 'session.subscribe', payload: { sessionId: session.id } });
    } catch (error: any) {
      const states = new Map(get().chatStates);
      states.set(session.id, { ...emptyChatState(), loaded: true });
      set({ chatStates: states, error: error.message, isLoading: false });
    }
  },

  closeSession: (sessionId) => {
    const { openSessionIds, activeSessionId, chatStates } = get();
    const filtered = openSessionIds.filter(id => id !== sessionId);
    const newStates = new Map(chatStates);
    const cs = newStates.get(sessionId);
    if (cs && cs.agentStatus === 'idle') {
      newStates.delete(sessionId);
    }

    let newActive = activeSessionId;
    if (activeSessionId === sessionId) {
      newActive = filtered.length > 0 ? filtered[filtered.length - 1] : null;
    }

    set({ openSessionIds: filtered, activeSessionId: newActive, chatStates: newStates });
  },

  createSession: async (workspaceId, title, workingDirectory) => {
    const session = await api.sessions.create(workspaceId, title, workingDirectory);
    await get().fetchSessions(workspaceId);
    return session;
  },

  updateSession: async (id, data) => {
    await api.sessions.update(id, data);
    const activeSession = get().getActiveSession();
    if (activeSession) {
      await get().fetchSessions(activeSession.workspaceId);
    }
  },

  deleteSession: async (id) => {
    const activeSession = get().getActiveSession();
    get().closeSession(id);
    await api.sessions.delete(id);
    if (activeSession) {
      await get().fetchSessions(activeSession.workspaceId);
    }
  },

  sendMessage: (content, sessionId?) => {
    const sid = sessionId || get().activeSessionId;
    if (!sid) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      sessionId: sid,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    set(state => {
      const states = new Map(state.chatStates);
      const cs = states.get(sid) || emptyChatState();
      states.set(sid, { ...cs, messages: [...cs.messages, userMessage] });
      return { chatStates: states };
    });

    socketService.send({
      type: 'chat.send',
      payload: { sessionId: sid, content },
    });
  },

  cancelExecution: (sessionId?) => {
    const sid = sessionId || get().activeSessionId;
    if (!sid) return;
    socketService.send({
      type: 'chat.cancel',
      payload: { sessionId: sid },
    });
  },

  appendStreamDelta: (sessionId, messageId, delta) => {
    set(state => {
      const states = new Map(state.chatStates);
      const cs = states.get(sessionId) || emptyChatState();
      const newStreaming = new Map(cs.streamingContent);
      newStreaming.set(messageId, (newStreaming.get(messageId) || '') + delta);

      const hasMsg = cs.messages.some(m => m.id === messageId);
      const messages = hasMsg ? cs.messages : [...cs.messages, {
        id: messageId,
        sessionId,
        role: 'assistant' as const,
        content: '',
        createdAt: new Date().toISOString(),
        isStreaming: true,
      }];

      states.set(sessionId, { ...cs, messages, streamingContent: newStreaming });
      return { chatStates: states };
    });
  },

  completeStream: (sessionId, messageId, content, metadata) => {
    set(state => {
      const states = new Map(state.chatStates);
      const cs = states.get(sessionId) || emptyChatState();
      const newStreaming = new Map(cs.streamingContent);
      newStreaming.delete(messageId);

      const messages = cs.messages.map(m =>
        m.id === messageId ? { ...m, content, isStreaming: false, metadata } : m
      );

      states.set(sessionId, {
        ...cs,
        messages,
        streamingContent: newStreaming,
        agentStatus: 'idle',
        agentStatusDetail: '',
      });
      return { chatStates: states };
    });
  },

  setAgentStatus: (sessionId, status, detail) => {
    set(state => {
      const states = new Map(state.chatStates);
      const cs = states.get(sessionId) || emptyChatState();
      states.set(sessionId, { ...cs, agentStatus: status, agentStatusDetail: detail || '' });
      return { chatStates: states };
    });
  },

  addToolCall: (sessionId, messageId, toolCall) => {
    set(state => {
      const states = new Map(state.chatStates);
      const cs = states.get(sessionId) || emptyChatState();

      const hasMsg = cs.messages.some(m => m.id === messageId);
      let messages: Message[];
      if (!hasMsg) {
        messages = [...cs.messages, {
          id: messageId,
          sessionId,
          role: 'assistant' as const,
          content: '',
          createdAt: new Date().toISOString(),
          isStreaming: true,
          toolCalls: [toolCall],
        }];
      } else {
        messages = cs.messages.map(m => {
          if (m.id !== messageId) return m;
          const existing = (m.toolCalls || []).find(tc => tc.toolCallId === toolCall.toolCallId);
          if (existing) {
            return {
              ...m,
              toolCalls: (m.toolCalls || []).map(tc =>
                tc.toolCallId === toolCall.toolCallId
                  ? { ...tc, ...toolCall }
                  : tc
              ),
            };
          }
          return { ...m, toolCalls: [...(m.toolCalls || []), toolCall] };
        });
      }

      states.set(sessionId, { ...cs, messages });
      return { chatStates: states };
    });
  },

  updateToolResult: (sessionId, messageId, toolCallId, result) => {
    set(state => {
      const states = new Map(state.chatStates);
      const cs = states.get(sessionId) || emptyChatState();

      const messages = cs.messages.map(m =>
        m.id === messageId
          ? {
              ...m,
              toolCalls: (m.toolCalls || []).map(tc =>
                tc.toolCallId === toolCallId ? { ...tc, result, status: 'completed' as const } : tc
              ),
            }
          : m
      );

      states.set(sessionId, { ...cs, messages });
      return { chatStates: states };
    });
  },

  addTraceSpan: (sessionId, messageId, span) => {
    set(state => {
      const states = new Map(state.chatStates);
      const cs = states.get(sessionId) || emptyChatState();

      const messages = cs.messages.map(m => {
        if (m.id !== messageId) return m;
        const existing = (m.traceSpans || []).findIndex(s => s.spanId === span.spanId);
        if (existing >= 0) {
          const updated = [...(m.traceSpans || [])];
          updated[existing] = span;
          return { ...m, traceSpans: updated };
        }
        return { ...m, traceSpans: [...(m.traceSpans || []), span] };
      });

      // Ensure the message exists
      if (!messages.find(m => m.id === messageId)) {
        messages.push({
          id: messageId,
          sessionId,
          role: 'assistant' as const,
          content: '',
          createdAt: new Date().toISOString(),
          isStreaming: true,
          traceSpans: [span],
        });
      }

      states.set(sessionId, { ...cs, messages });
      return { chatStates: states };
    });
  },
}));
