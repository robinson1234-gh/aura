import { useEffect, useState } from 'react';
import { Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { StatusIndicator } from '../common/StatusIndicator';
import { useSessionStore } from '../../stores/sessionStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useConfigStore } from '../../stores/configStore';
import { api } from '../../services/api';

export function Header() {
  const activeSessionId = useSessionStore(s => s.activeSessionId);
  const sessions = useSessionStore(s => s.sessions);
  const chatStates = useSessionStore(s => s.chatStates);
  const { activeWorkspace } = useWorkspaceStore();
  const { sidebarOpen, toggleSidebar, toggleConfigPanel } = useConfigStore();
  const [defaultAgent, setDefaultAgent] = useState<string>('');

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const cs = activeSessionId ? chatStates.get(activeSessionId) : undefined;
  const agentStatus = cs?.agentStatus || 'idle';
  const agentStatusDetail = cs?.agentStatusDetail || '';

  useEffect(() => {
    api.health().then(h => setDefaultAgent(h.defaultAgent)).catch(() => {});
  }, [agentStatus]);

  return (
    <header className="h-12 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 flex items-center px-4 gap-3">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-4 h-4 text-slate-500" />
        ) : (
          <PanelLeft className="w-4 h-4 text-slate-500" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-3">
        {activeWorkspace && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 font-mono text-xs bg-slate-100 dark:bg-slate-800 rounded px-2 py-0.5">
              {activeWorkspace.path}
            </span>
            {activeSession && (
              <>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-xs">
                  {activeSession.title}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {defaultAgent && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {defaultAgent}
        </span>
      )}

      <StatusIndicator status={agentStatus} detail={agentStatusDetail} />

      <button
        onClick={toggleConfigPanel}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Settings (LLM, Skills, Soul)"
      >
        <Settings className="w-4 h-4 text-slate-500" />
      </button>
    </header>
  );
}
