import { useEffect, useRef } from 'react';
import { Bot, Loader2, FolderOpen } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useSessionStore } from '../../stores/sessionStore';

interface Props {
  sessionId: string;
}

export function ChatPanel({ sessionId }: Props) {
  const sessions = useSessionStore(s => s.sessions);
  const chatStates = useSessionStore(s => s.chatStates);
  const bottomRef = useRef<HTMLDivElement>(null);

  const session = sessions.find(s => s.id === sessionId);
  const cs = chatStates.get(sessionId);
  const messages = cs?.messages || [];
  const streamingContent = cs?.streamingContent || new Map<string, string>();
  const agentStatus = cs?.agentStatus || 'idle';
  const agentStatusDetail = cs?.agentStatusDetail || '';

  const activeToolCount = messages.reduce((count, m) => {
    if (!m.toolCalls) return count;
    return count + m.toolCalls.filter(tc => tc.status === 'running').length;
  }, 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {session?.workingDirectory && (
        <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <FolderOpen className="w-3 h-3 shrink-0" />
          <span className="truncate">{session.workingDirectory}</span>
        </div>
      )}
      {(agentStatus === 'thinking' || agentStatus === 'executing') && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="font-medium">{agentStatusDetail || (agentStatus === 'thinking' ? 'Thinking...' : 'Executing...')}</span>
          {activeToolCount > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded-full ml-auto">
              {activeToolCount} tool{activeToolCount > 1 ? 's' : ''} running
            </span>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-primary-500/10 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-500" />
              </div>
              <p className="text-sm text-slate-400">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                streamContent={msg.isStreaming ? streamingContent.get(msg.id) : undefined}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput sessionId={sessionId} />
    </div>
  );
}
