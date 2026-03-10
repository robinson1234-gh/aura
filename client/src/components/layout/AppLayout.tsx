import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatArea } from '../chat/ChatArea';
import { SettingsPage } from '../config/SettingsPage';
import { AdminPage } from '../admin/AdminPage';
import { useConfigStore } from '../../stores/configStore';
import { useSessionStore } from '../../stores/sessionStore';
import { socketService } from '../../services/socket';
import type { WSServerMessage } from '../../types';

export function AppLayout() {
  const { sidebarOpen, configPanelOpen, adminPanelOpen, theme } = useConfigStore();
  const { appendStreamDelta, completeStream, setAgentStatus, addToolCall, updateToolResult, addTraceSpan } = useSessionStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    socketService.connect();

    const unsubscribe = socketService.subscribe((msg: WSServerMessage) => {
      switch (msg.type) {
        case 'chat.stream':
          appendStreamDelta(msg.payload.sessionId, msg.payload.messageId, msg.payload.delta);
          break;

        case 'chat.complete':
          completeStream(msg.payload.sessionId, msg.payload.messageId, msg.payload.content, msg.payload.metadata);
          break;

        case 'agent.status':
          setAgentStatus(msg.payload.sessionId, msg.payload.status, msg.payload.detail);
          break;

        case 'chat.tool_call':
          addToolCall(msg.payload.sessionId, msg.payload.messageId, {
            toolCallId: msg.payload.toolCallId,
            toolName: msg.payload.toolName,
            arguments: msg.payload.arguments,
            status: 'running',
          });
          break;

        case 'chat.tool_result':
          updateToolResult(msg.payload.sessionId, msg.payload.messageId, msg.payload.toolCallId, msg.payload.result);
          break;

        case 'trace.span':
          addTraceSpan(msg.payload.sessionId, msg.payload.messageId, msg.payload.span);
          break;

        case 'error':
          console.error('[WS Error]', msg.payload);
          if (msg.payload.sessionId) {
            setAgentStatus(msg.payload.sessionId, 'error', msg.payload.message);
          }
          break;

        case 'connected':
          console.log('[WS]', msg.payload.message);
          break;
      }
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-surface-950">
      {sidebarOpen && !configPanelOpen && !adminPanelOpen && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex-1 flex min-h-0">
          {adminPanelOpen ? <AdminPage /> : configPanelOpen ? <SettingsPage /> : <ChatArea />}
        </div>
      </div>
    </div>
  );
}
