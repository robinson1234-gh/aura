import { create } from 'zustand';
import type { Workspace } from '../types';
import { api } from '../services/api';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (name: string, parentId: string | null, level: string) => Promise<Workspace>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await api.workspaces.list();
      set({ workspaces, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setActiveWorkspace: (workspace) => {
    set({ activeWorkspace: workspace });
  },

  createWorkspace: async (name, parentId, level) => {
    const workspace = await api.workspaces.create({ name, parentId: parentId || undefined, level });
    await get().fetchWorkspaces();
    return workspace;
  },

  updateWorkspace: async (id, name) => {
    await api.workspaces.update(id, name);
    await get().fetchWorkspaces();
  },

  deleteWorkspace: async (id) => {
    const response = await fetch(`http://localhost:3001/api/workspaces/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(body.error || 'Delete failed');
    }
    const active = get().activeWorkspace;
    if (active && active.id === id) {
      set({ activeWorkspace: null });
    }
    await get().fetchWorkspaces();
  },
}));
