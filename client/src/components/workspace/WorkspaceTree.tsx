import { useEffect, useState } from 'react';
import { FolderOpen, Folder, Plus, ChevronRight, ChevronDown, Trash2, Pencil } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useSessionStore } from '../../stores/sessionStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Workspace } from '../../types';

export function WorkspaceTree() {
  const { workspaces, activeWorkspace, fetchWorkspaces, setActiveWorkspace, createWorkspace, deleteWorkspace, updateWorkspace } = useWorkspaceStore();
  const { fetchSessions, setActiveSession } = useSessionStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectWorkspace = (ws: Workspace) => {
    if (activeWorkspace?.id !== ws.id) {
      setActiveSession(null);
    }
    setActiveWorkspace(ws);
    fetchSessions(ws.id);
  };

  const getChildLevel = (parentLevel: string): string => {
    const depth = parentLevel.split('/').length;
    const labels = ['domain', 'category', 'project'];
    if (depth < labels.length) return labels[depth];
    return `level-${depth + 1}`;
  };

  const handleCreate = async () => {
    if (!newName.trim() || !creating) return;
    const parentWs = creating.parentId
      ? workspaces.flatMap(function flatten(w: Workspace): Workspace[] { return [w, ...(w.children || []).flatMap(flatten)]; }).find(w => w.id === creating.parentId)
      : null;
    const level = parentWs ? getChildLevel(parentWs.level) : 'domain';
    try {
      await createWorkspace(newName.trim(), creating.parentId, level);
      setCreating(null);
      setNewName('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateWorkspace(id, editName.trim());
      setEditingId(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkspace(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError('');
    } catch (e: any) {
      setDeleteError(e.message);
    }
  };

  const renderNode = (ws: Workspace, depth = 0) => {
    const isExpanded = expanded.has(ws.id);
    const isActive = activeWorkspace?.id === ws.id;
    const hasChildren = ws.children && ws.children.length > 0;
    const isEditing = editingId === ws.id;

    return (
      <div key={ws.id}>
        <div
          className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors
            ${isActive ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            toggle(ws.id);
            selectWorkspace(ws);
          }}
        >
          {hasChildren ? (
            <span className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          ) : (
            <span className="w-4" />
          )}

          {isActive || isExpanded ? (
            <FolderOpen className="w-4 h-4 text-primary-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-slate-400 shrink-0" />
          )}

          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => handleRename(ws.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename(ws.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="flex-1 bg-white dark:bg-slate-800 border border-primary-500 rounded px-1 text-sm outline-none"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate">{ws.name}</span>
          )}

          {ws.sessionCount !== undefined && ws.sessionCount > 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">
              {ws.sessionCount}
            </span>
          )}

          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={e => {
                e.stopPropagation();
                setCreating({ parentId: ws.id });
                setNewName('');
                setExpanded(prev => new Set(prev).add(ws.id));
              }}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Add child"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setEditingId(ws.id);
                setEditName(ws.name);
              }}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Rename"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {!hasChildren && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setDeleteError('');
                  setDeleteTarget(ws);
                }}
                className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {isExpanded && ws.children?.map(child => renderNode(child, depth + 1))}

        {creating && creating.parentId === ws.id && isExpanded && (
          <div className="flex items-center gap-1 py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 28}px` }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setCreating(null);
              }}
              placeholder="New workspace..."
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none focus:border-primary-500"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="py-2">
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workspaces</h3>
          <button
            onClick={() => {
              setCreating({ parentId: null });
              setNewName('');
            }}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="New workspace"
          >
            <Plus className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {workspaces.map(ws => renderNode(ws))}

        {creating && creating.parentId === null && (
          <div className="flex items-center gap-1 px-3 py-1">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setCreating(null);
              }}
              placeholder="New workspace..."
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none focus:border-primary-500"
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workspace"
        message={deleteError || `Are you sure you want to delete "${deleteTarget?.name}"? All chats and messages in this workspace will be permanently lost.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
      />
    </>
  );
}
