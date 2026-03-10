const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  workspaces: {
    list: () => request<any[]>('/workspaces'),
    create: (data: { name: string; parentId?: string; level: string }) =>
      request<any>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, name: string) =>
      request<any>(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    delete: (id: string) =>
      request<void>(`/workspaces/${id}`, { method: 'DELETE' }),
  },

  sessions: {
    list: (workspaceId: string) => request<any[]>(`/sessions?workspaceId=${workspaceId}`),
    create: (workspaceId: string, title?: string, workingDirectory?: string) =>
      request<any>('/sessions', { method: 'POST', body: JSON.stringify({ workspaceId, title, workingDirectory }) }),
    update: (id: string, data: any) =>
      request<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/sessions/${id}`, { method: 'DELETE' }),
    messages: (id: string, limit = 100) =>
      request<any[]>(`/sessions/${id}/messages?limit=${limit}`),
  },

  config: {
    resolve: (path: string) => request<any>(`/config/resolve/${path}`),
    getFile: (wsPath: string, filename: string) => request<{ content: string }>(`/config/file/${filename}/${wsPath}`),
    saveFile: (wsPath: string, filename: string, content: string) =>
      request<any>(`/config/file/${filename}/${wsPath}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    generate: (wsPath: string, filename: string, description: string) =>
      request<{ content: string }>(`/config/generate/${filename}/${wsPath}`, { method: 'POST', body: JSON.stringify({ description }) }),
    getSkill: (path: string) => request<{ content: string }>(`/config/skill/${path}`),
    saveSkill: (path: string, content: string) =>
      request<any>(`/config/skill/${path}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    getSoul: (path: string) => request<{ content: string }>(`/config/soul/${path}`),
    saveSoul: (path: string, content: string) =>
      request<any>(`/config/soul/${path}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    getSettings: (path: string) => request<Record<string, unknown>>(`/config/settings/${path}`),
    saveSettings: (path: string, settings: Record<string, unknown>) =>
      request<any>(`/config/settings/${path}`, { method: 'PUT', body: JSON.stringify(settings) }),
  },

  files: {
    upload: async (file: File, sessionId?: string): Promise<{ id: string; filename: string; mimetype: string; size: number }> => {
      const formData = new FormData();
      formData.append('file', file);
      if (sessionId) formData.append('sessionId', sessionId);
      const response = await fetch(`${BASE_URL}/files`, { method: 'POST', body: formData });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Upload failed');
      }
      return response.json();
    },
  },

  health: () => request<{ status: string; defaultAgent: string; agents: Record<string, boolean> }>('/health'),
  agents: () => request<Array<{ name: string; description: string; isDefault: boolean }>>('/agents'),

  llm: {
    getConfig: () => request<any>('/llm/config'),
    saveConfig: (data: { provider: string; apiKey: string; model?: string; baseUrl?: string }) =>
      request<any>('/llm/config', { method: 'PUT', body: JSON.stringify(data) }),
    getProviders: () => request<Record<string, { baseUrl: string; model: string }>>('/llm/providers'),
  },

  cursor: {
    getConfig: () => request<{ configured: boolean; apiKeySet?: boolean; apiKeyPreview?: string }>('/cursor/config'),
    saveConfig: (data: { apiKey: string }) =>
      request<{ success: boolean }>('/cursor/config', { method: 'PUT', body: JSON.stringify(data) }),
  },

  agentControl: {
    setDefault: (name: string) =>
      request<any>(`/agents/default/${name}`, { method: 'PUT' }),
    reselect: () =>
      request<{ defaultAgent: string }>('/agents/reselect', { method: 'POST' }),
  },

  summaries: {
    get: (id: string) => request<{ id: string; content: string }>(`/summaries/${id}`),
  },

  admin: {
    stats: () => request<{ workspaceCount: number; sessionCount: number; messageCount: number; memoryCount: number }>('/admin/stats'),
    workspaces: () => request<any[]>('/admin/workspaces'),
    sessions: (workspaceId?: string) => request<any[]>(`/admin/sessions${workspaceId ? `?workspaceId=${workspaceId}` : ''}`),
    memories: () => request<any[]>('/admin/memories'),
    bulkDeleteSessions: (ids: string[]) => request<any>('/admin/sessions/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
    bulkDeleteMemories: (ids: string[]) => request<any>('/admin/memories/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
  },

  memory: {
    list: (wsPath: string, exact = false) =>
      request<any[]>(`/memory/list/${wsPath}?exact=${exact}`),
    create: (wsPath: string, category: string, content: string) =>
      request<any>(`/memory/add/${wsPath}`, { method: 'POST', body: JSON.stringify({ category, content, source: 'manual' }) }),
    update: (id: string, content: string, category?: string) =>
      request<any>(`/memory/entry/${id}`, { method: 'PUT', body: JSON.stringify({ content, category }) }),
    delete: (id: string) =>
      request<void>(`/memory/entry/${id}`, { method: 'DELETE' }),
    getContext: (wsPath: string) =>
      request<{ context: string }>(`/memory/context/${wsPath}`),
  },
};
