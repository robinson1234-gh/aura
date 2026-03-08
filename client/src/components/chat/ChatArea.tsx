import { Bot } from 'lucide-react';
import { ChatTabs } from './ChatTabs';
import { ChatPanel } from './ChatPanel';
import { useSessionStore } from '../../stores/sessionStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function ChatArea() {
  const { openSessionIds, activeSessionId } = useSessionStore();
  const { activeWorkspace } = useWorkspaceStore();

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary-500/10 rounded-2xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Welcome to WorkAgent</h2>
            <p className="text-sm text-slate-400 mt-1">Select a workspace from the sidebar to get started</p>
          </div>
        </div>
      </div>
    );
  }

  if (openSessionIds.length === 0 || !activeSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              {activeWorkspace.path}
            </h2>
            <p className="text-sm text-slate-400 mt-1">Create a new chat to start working</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {openSessionIds.length > 1 && <ChatTabs />}
      <ChatPanel key={activeSessionId} sessionId={activeSessionId} />
    </div>
  );
}
