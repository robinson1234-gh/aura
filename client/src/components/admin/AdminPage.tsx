import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, FolderTree, MessageSquare, Brain, Cpu, Trash2,
  ChevronDown, ChevronRight, CheckSquare, Square, Search, RefreshCw,
  ArrowLeft, AlertCircle, Clock, Hash, FileText, CheckCircle2, XCircle,
  BookOpen, Cog, Bot, Key,
} from 'lucide-react';
import { useConfigStore } from '../../stores/configStore';
import { api } from '../../services/api';

type Tab = 'dashboard' | 'workspaces' | 'sessions' | 'memories' | 'agents';

interface Stats { workspaceCount: number; sessionCount: number; messageCount: number; memoryCount: number }
interface AdminWorkspace { id: string; name: string; path: string; level: string; parentId: string | null; sessionCount: number; messageCount: number; configs: Record<string, boolean>; createdAt: string; updatedAt: string }
interface AdminSession { id: string; title: string; workspaceId: string; workspacePath: string; workspaceName: string; workingDirectory: string | null; messageCount: number; lastMessageAt: string | null; isActive: boolean; createdAt: string; updatedAt: string }
interface AdminMemory { id: string; workspacePath: string; category: string; content: string; source: string; relevance: number; accessCount: number; lastAccessed: string | null; createdAt: string; updatedAt: string }

const CATEGORY_ICONS: Record<string, typeof BookOpen> = { semantic: BookOpen, episodic: Clock, procedural: Cog };
const CATEGORY_COLORS: Record<string, string> = { semantic: 'text-blue-500', episodic: 'text-amber-500', procedural: 'text-emerald-500' };

export function AdminPage() {
  const { toggleAdminPanel } = useConfigStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [memories, setMemories] = useState<AdminMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [sessionFilter, setSessionFilter] = useState('');
  const [memoryFilter, setMemoryFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'sessions' | 'memories'; ids: string[] } | null>(null);
  const [agentHealth, setAgentHealth] = useState<{ defaultAgent: string; agents: Record<string, boolean> } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([api.admin.stats(), api.health()]);
      setStats(s);
      setAgentHealth(h);
    } catch { /* ignore */ }
  }, []);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try { setWorkspaces(await api.admin.workspaces()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try { setSessions(await api.admin.sessions()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try { setMemories(await api.admin.memories()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    if (tab === 'workspaces') loadWorkspaces();
    if (tab === 'sessions') loadSessions();
    if (tab === 'memories') loadMemories();
    if (tab === 'agents') loadStats();
  }, [tab]);

  const handleBulkDeleteSessions = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'sessions') return;
    await api.admin.bulkDeleteSessions(deleteConfirm.ids);
    setDeleteConfirm(null);
    setSelectedSessions(new Set());
    loadSessions();
    loadStats();
  };

  const handleBulkDeleteMemories = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'memories') return;
    await api.admin.bulkDeleteMemories(deleteConfirm.ids);
    setDeleteConfirm(null);
    setSelectedMemories(new Set());
    loadMemories();
    loadStats();
  };

  const filteredSessions = sessions.filter(s =>
    !sessionFilter || s.title.toLowerCase().includes(sessionFilter.toLowerCase()) || s.workspacePath.toLowerCase().includes(sessionFilter.toLowerCase())
  );

  const filteredMemories = memories.filter(m =>
    !memoryFilter || m.content.toLowerCase().includes(memoryFilter.toLowerCase()) || m.workspacePath.toLowerCase().includes(memoryFilter.toLowerCase())
  );

  const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workspaces', label: 'Workspaces', icon: FolderTree },
    { id: 'sessions', label: 'Sessions', icon: MessageSquare },
    { id: 'memories', label: 'Memories', icon: Brain },
    { id: 'agents', label: 'Agents', icon: Cpu },
  ];

  return (
    <div className="flex-1 flex min-h-0">
      {/* Sidebar */}
      <div className="w-52 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <button onClick={toggleAdminPanel} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Chat
          </button>
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">Admin</p>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors text-left ${tab === t.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Icon className="w-4 h-4 shrink-0" /> {t.label}
                {t.id === 'workspaces' && stats && <span className="ml-auto text-[10px] text-slate-400">{stats.workspaceCount}</span>}
                {t.id === 'sessions' && stats && <span className="ml-auto text-[10px] text-slate-400">{stats.sessionCount}</span>}
                {t.id === 'memories' && stats && <span className="ml-auto text-[10px] text-slate-400">{stats.memoryCount}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        {tab === 'dashboard' && <DashboardPanel stats={stats} agentHealth={agentHealth} onNavigate={setTab} />}
        {tab === 'workspaces' && <WorkspacesPanel workspaces={workspaces} loading={loading} onRefresh={loadWorkspaces} />}
        {tab === 'sessions' && (
          <SessionsPanel
            sessions={filteredSessions} loading={loading} filter={sessionFilter} selected={selectedSessions}
            onFilterChange={setSessionFilter} onRefresh={loadSessions}
            onToggleSelect={id => { const s = new Set(selectedSessions); s.has(id) ? s.delete(id) : s.add(id); setSelectedSessions(s); }}
            onSelectAll={() => setSelectedSessions(new Set(filteredSessions.map(s => s.id)))}
            onDeselectAll={() => setSelectedSessions(new Set())}
            onBulkDelete={() => setDeleteConfirm({ type: 'sessions', ids: [...selectedSessions] })}
          />
        )}
        {tab === 'memories' && (
          <MemoriesPanel
            memories={filteredMemories} loading={loading} filter={memoryFilter} selected={selectedMemories}
            onFilterChange={setMemoryFilter} onRefresh={loadMemories}
            onToggleSelect={id => { const s = new Set(selectedMemories); s.has(id) ? s.delete(id) : s.add(id); setSelectedMemories(s); }}
            onSelectAll={() => setSelectedMemories(new Set(filteredMemories.map(m => m.id)))}
            onDeselectAll={() => setSelectedMemories(new Set())}
            onBulkDelete={() => setDeleteConfirm({ type: 'memories', ids: [...selectedMemories] })}
          />
        )}
        {tab === 'agents' && <AgentsPanel agentHealth={agentHealth} onRefresh={loadStats} />}

        {/* Delete confirmation dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirm Delete</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete {deleteConfirm.ids.length} {deleteConfirm.type}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
                <button onClick={deleteConfirm.type === 'sessions' ? handleBulkDeleteSessions : handleBulkDeleteMemories} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Dashboard Panel ───── */
function DashboardPanel({ stats, agentHealth, onNavigate }: { stats: Stats | null; agentHealth: any; onNavigate: (tab: Tab) => void }) {
  const cards = [
    { label: 'Workspaces', value: stats?.workspaceCount ?? '-', icon: FolderTree, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', tab: 'workspaces' as Tab },
    { label: 'Sessions', value: stats?.sessionCount ?? '-', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', tab: 'sessions' as Tab },
    { label: 'Messages', value: stats?.messageCount ?? '-', icon: Hash, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20', tab: 'sessions' as Tab },
    { label: 'Memories', value: stats?.memoryCount ?? '-', icon: Brain, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', tab: 'memories' as Tab },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-primary-500" /> Admin Dashboard
      </h2>
      <p className="text-sm text-slate-500 mb-6">Overview of all workspaces, sessions, agents, and memories.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.label} onClick={() => onNavigate(c.tab)} className={`rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:shadow-md transition-shadow`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{c.value}</p>
              <p className="text-xs text-slate-500 mt-1">{c.label}</p>
            </button>
          );
        })}
      </div>

      {agentHealth && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary-500" /> Agent Status
          </h3>
          <div className="flex items-center gap-4">
            {Object.entries(agentHealth.agents as Record<string, boolean>).map(([name, healthy]) => (
              <div key={name} className="flex items-center gap-2">
                {healthy ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{name}</span>
                {agentHealth.defaultAgent === name && <span className="text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">default</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Workspaces Panel ───── */
function WorkspacesPanel({ workspaces, loading, onRefresh }: { workspaces: AdminWorkspace[]; loading: boolean; onRefresh: () => void }) {
  const CONFIG_FILES = ['AGENT.md', 'SKILL.md', 'IDENTITY.md', 'MEMORY.md', 'USER.md', 'SOUL.md'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-blue-500" /> Workspaces
        </h2>
        <button onClick={onRefresh} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Path</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Sessions</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Messages</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Config Files</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {workspaces.map(w => (
              <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{w.path}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{w.sessionCount}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{w.messageCount}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1 flex-wrap">
                    {CONFIG_FILES.map(f => (
                      <span key={f} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${w.configs[f] ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        {w.configs[f] ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                        {f.replace('.md', '')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{new Date(w.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No workspaces found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Sessions Panel ───── */
function SessionsPanel({ sessions, loading, filter, selected, onFilterChange, onRefresh, onToggleSelect, onSelectAll, onDeselectAll, onBulkDelete }: {
  sessions: AdminSession[]; loading: boolean; filter: string; selected: Set<string>;
  onFilterChange: (v: string) => void; onRefresh: () => void;
  onToggleSelect: (id: string) => void; onSelectAll: () => void; onDeselectAll: () => void; onBulkDelete: () => void;
}) {
  const allSelected = sessions.length > 0 && selected.size === sessions.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" /> Sessions
        </h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={onBulkDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium">
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selected.size})
            </button>
          )}
          <button onClick={onRefresh} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={filter} onChange={e => onFilterChange(e.target.value)} placeholder="Filter by title or workspace..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="w-10 px-3 py-2.5">
                <button onClick={allSelected ? onDeselectAll : onSelectAll}>
                  {allSelected ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Title</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Workspace</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Messages</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map(s => (
              <tr key={s.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${selected.has(s.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                <td className="w-10 px-3 py-2.5">
                  <button onClick={() => onToggleSelect(s.id)}>
                    {selected.has(s.id) ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">{s.title}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{s.workspacePath}</td>
                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{s.messageCount}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">{filter ? 'No sessions match your filter' : 'No sessions found'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Memories Panel ───── */
function MemoriesPanel({ memories, loading, filter, selected, onFilterChange, onRefresh, onToggleSelect, onSelectAll, onDeselectAll, onBulkDelete }: {
  memories: AdminMemory[]; loading: boolean; filter: string; selected: Set<string>;
  onFilterChange: (v: string) => void; onRefresh: () => void;
  onToggleSelect: (id: string) => void; onSelectAll: () => void; onDeselectAll: () => void; onBulkDelete: () => void;
}) {
  const allSelected = memories.length > 0 && selected.size === memories.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500" /> Memories
        </h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={onBulkDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium">
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selected.size})
            </button>
          )}
          <button onClick={onRefresh} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={filter} onChange={e => onFilterChange(e.target.value)} placeholder="Filter by content or workspace..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="w-10 px-3 py-2.5">
                <button onClick={allSelected ? onDeselectAll : onSelectAll}>
                  {allSelected ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Content</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Workspace</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Source</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {memories.map(m => {
              const CatIcon = CATEGORY_ICONS[m.category] || BookOpen;
              const catColor = CATEGORY_COLORS[m.category] || 'text-slate-500';
              return (
                <tr key={m.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${selected.has(m.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                  <td className="w-10 px-3 py-2.5">
                    <button onClick={() => onToggleSelect(m.id)}>
                      {selected.has(m.id) ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`flex items-center gap-1 text-xs font-medium ${catColor}`}>
                      <CatIcon className="w-3.5 h-3.5" /> {m.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-xs max-w-md truncate">{m.content}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{m.workspacePath}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${m.source === 'auto' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {m.source}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">{m.accessCount}x</td>
                </tr>
              );
            })}
            {memories.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">{filter ? 'No memories match your filter' : 'No memories found'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Agents Panel ───── */
function AgentsPanel({ agentHealth, onRefresh }: { agentHealth: any; onRefresh: () => void }) {
  const agents = agentHealth ? Object.entries(agentHealth.agents as Record<string, boolean>) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-violet-500" /> Agents
        </h2>
        <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="space-y-3">
        {agents.map(([name, healthy]) => (
          <div key={name} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${healthy ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              {name === 'llm' ? <Key className={`w-5 h-5 ${healthy ? 'text-green-500' : 'text-red-500'}`} /> :
               name === 'cursor' ? <Bot className={`w-5 h-5 ${healthy ? 'text-green-500' : 'text-red-500'}`} /> :
               <Cpu className={`w-5 h-5 ${healthy ? 'text-green-500' : 'text-red-500'}`} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{name}</span>
                {agentHealth.defaultAgent === name && <span className="text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">default</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{healthy ? 'Healthy and ready' : 'Not configured or unavailable'}</p>
            </div>
            {healthy ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}
