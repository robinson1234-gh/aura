import { X, Loader2, MessageSquare } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';

export function ChatTabs() {
  const { sessions, openSessionIds, activeSessionId, chatStates, closeSession } = useSessionStore();
  const setActiveSessionId = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) useSessionStore.getState().setActiveSession(session);
  };

  return (
    <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 overflow-x-auto scrollbar-thin">
      {openSessionIds.map(id => {
        const session = sessions.find(s => s.id === id);
        if (!session) return null;
        const isActive = id === activeSessionId;
        const cs = chatStates.get(id);
        const isBusy = cs && (cs.agentStatus === 'thinking' || cs.agentStatus === 'executing');

        return (
          <div
            key={id}
            className={`group flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-b-2 transition-colors shrink-0 max-w-[200px] ${
              isActive
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-slate-50 dark:bg-slate-800/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
            onClick={() => setActiveSessionId(id)}
          >
            {isBusy ? (
              <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
            ) : (
              <MessageSquare className="w-3 h-3 shrink-0" />
            )}
            <span className="truncate font-medium">{session.title}</span>
            <button
              onClick={e => {
                e.stopPropagation();
                closeSession(id);
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
