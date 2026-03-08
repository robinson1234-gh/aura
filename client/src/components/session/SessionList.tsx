import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Pencil, FolderOpen, Loader2 } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { NewChatDialog } from './NewChatDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Session } from '../../types';

export function SessionList() {
  const { sessions, activeSessionId, createSession, setActiveSession, deleteSession, updateSession, chatStates } = useSessionStore();
  const { activeWorkspace } = useWorkspaceStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);

  if (!activeWorkspace) return null;

  const handleNewChat = async (workingDirectory?: string) => {
    setShowNewChat(false);
    const session = await createSession(activeWorkspace.id, undefined, workingDirectory);
    setActiveSession(session);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return;
    await updateSession(id, { title: editTitle.trim() });
    setEditingId(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await deleteSession(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="py-2">
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Chats
          </h3>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-0.5 px-2">
          {sessions.map((session: Session) => {
            const isActive = activeSessionId === session.id;
            const isEditing = editingId === session.id;
            const cs = chatStates.get(session.id);
            const isBusy = cs && (cs.agentStatus === 'thinking' || cs.agentStatus === 'executing');

            return (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors
                  ${isActive ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
                `}
                onClick={() => !isEditing && setActiveSession(session)}
              >
                {isBusy ? (
                  <Loader2 className="w-4 h-4 shrink-0 text-blue-500 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4 shrink-0 text-slate-400" />
                )}

                {isEditing ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(session.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(session.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 bg-white dark:bg-slate-800 border border-primary-500 rounded px-1 text-sm outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{session.title}</span>
                    {session.workingDirectory && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono truncate" title={session.workingDirectory}>
                        <FolderOpen className="w-2.5 h-2.5 shrink-0" />
                        {session.workingDirectory.split(/[/\\]/).pop()}
                      </span>
                    )}
                  </div>
                )}

                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setEditingId(session.id);
                      setEditTitle(session.title);
                    }}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setDeleteTarget(session);
                    }}
                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {sessions.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">
              No chats yet. Click + to start.
            </p>
          )}
        </div>
      </div>

      <NewChatDialog
        open={showNewChat}
        onConfirm={handleNewChat}
        onCancel={() => setShowNewChat(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Chat"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? All messages in this chat will be permanently lost.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
