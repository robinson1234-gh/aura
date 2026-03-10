import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, FolderTree, MessageSquare, Brain, Cpu, Trash2,
  ChevronDown, ChevronRight, CheckSquare, Square, Search, RefreshCw,
  ArrowLeft, AlertCircle, Clock, Hash, FileText, CheckCircle2, XCircle,
  BookOpen, Cog, Bot, Key, Plus, Pencil, Power, PowerOff, Star, Save, X,
  Wrench, Plug, Terminal, Globe, Zap, Link, Unlink,
} from 'lucide-react';
import { useConfigStore } from '../../stores/configStore';
import { api } from '../../services/api';

type Tab = 'dashboard' | 'workspaces' | 'sessions' | 'memories' | 'agents' | 'tools' | 'mcp';

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
  const [agentRecords, setAgentRecords] = useState<any[]>([]);
  const [customTools, setCustomTools] = useState<{ tools: any[]; registeredTools: string[] }>({ tools: [], registeredTools: [] });
  const [mcpServers, setMcpServers] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([api.admin.stats(), api.health()]);
      setStats(s);
      setAgentHealth(h);
    } catch { /* ignore */ }
  }, []);

  const loadAgentRecords = useCallback(async () => {
    try {
      const [records, h] = await Promise.all([api.agentControl.getRecords(), api.health()]);
      setAgentRecords(records);
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

  const loadTools = useCallback(async () => {
    setLoading(true);
    try { setCustomTools(await api.admin.tools()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadMcpServers = useCallback(async () => {
    setLoading(true);
    try { setMcpServers(await api.admin.mcpServers()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    if (tab === 'workspaces') loadWorkspaces();
    if (tab === 'sessions') loadSessions();
    if (tab === 'memories') loadMemories();
    if (tab === 'agents') loadAgentRecords();
    if (tab === 'tools') loadTools();
    if (tab === 'mcp') loadMcpServers();
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
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'mcp', label: 'MCP', icon: Plug },
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
                {t.id === 'tools' && stats && <span className="ml-auto text-[10px] text-slate-400">{(stats as any).toolCount ?? 0}</span>}
                {t.id === 'mcp' && stats && <span className="ml-auto text-[10px] text-slate-400">{(stats as any).mcpCount ?? 0}</span>}
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
        {tab === 'agents' && <AgentsPanel agentRecords={agentRecords} agentHealth={agentHealth} onRefresh={loadAgentRecords} />}
        {tab === 'tools' && <ToolsPanel tools={customTools.tools} registeredTools={customTools.registeredTools} loading={loading} onRefresh={loadTools} />}
        {tab === 'mcp' && <McpPanel servers={mcpServers} loading={loading} onRefresh={() => { loadMcpServers(); loadTools(); }} />}

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
    { label: 'Tools', value: (stats as any)?.toolCount ?? '-', icon: Wrench, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20', tab: 'tools' as Tab },
    { label: 'MCP Servers', value: (stats as any)?.mcpCount ?? '-', icon: Plug, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20', tab: 'mcp' as Tab },
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
interface AgentRecord { id: string; name: string; type: string; description: string; enabled: boolean; isDefault: boolean; config: Record<string, unknown>; createdAt: string; updatedAt: string }

function AgentsPanel({ agentRecords, agentHealth, onRefresh }: { agentRecords: AgentRecord[]; agentHealth: any; onRefresh: () => void }) {
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AgentRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const BUILT_IN = ['echo', 'cursor', 'llm'];
  const healthMap: Record<string, boolean> = agentHealth?.agents || {};

  const handleToggleEnabled = async (agent: AgentRecord) => {
    setActionLoading(agent.id);
    try {
      await api.agentControl.setEnabled(agent.name, !agent.enabled);
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleSetDefault = async (agent: AgentRecord) => {
    setActionLoading(agent.id);
    try {
      await api.agentControl.setDefault(agent.name);
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleDelete = async (agent: AgentRecord) => {
    try {
      await api.agentControl.deleteRecord(agent.id);
      setDeleteConfirm(null);
      onRefresh();
    } catch { /* ignore */ }
  };

  const getAgentIcon = (name: string) => {
    if (name === 'llm') return Key;
    if (name === 'cursor') return Bot;
    return Cpu;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-violet-500" /> Agents
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowAddForm(true); setEditingAgent(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Agent
          </button>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {agentRecords.map(agent => {
          const Icon = getAgentIcon(agent.name);
          const healthy = healthMap[agent.name] ?? false;
          const isBuiltIn = BUILT_IN.includes(agent.name);
          const isDefault = agentHealth?.defaultAgent === agent.name;

          return (
            <div key={agent.id} className={`rounded-xl border p-4 transition-colors ${
              !agent.enabled ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-60' :
              'border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  !agent.enabled ? 'bg-slate-100 dark:bg-slate-800' :
                  healthy ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <Icon className={`w-5 h-5 ${!agent.enabled ? 'text-slate-400' : healthy ? 'text-green-500' : 'text-red-500'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{agent.name}</span>
                    {isDefault && <span className="text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">default</span>}
                    {isBuiltIn && <span className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">built-in</span>}
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${agent.enabled ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                      {agent.enabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{agent.description || 'No description'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Type: {agent.type} · Updated: {new Date(agent.updatedAt).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Set Default */}
                  {agent.enabled && !isDefault && (
                    <button
                      onClick={() => handleSetDefault(agent)}
                      disabled={actionLoading === agent.id}
                      title="Set as default"
                      className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => { setEditingAgent(agent); setShowAddForm(false); }}
                    title="Edit"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Enable/Disable */}
                  <button
                    onClick={() => handleToggleEnabled(agent)}
                    disabled={actionLoading === agent.id}
                    title={agent.enabled ? 'Disable' : 'Enable'}
                    className={`p-2 rounded-lg transition-colors ${
                      agent.enabled
                        ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500'
                        : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-400 hover:text-green-500'
                    }`}
                  >
                    {agent.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>

                  {/* Delete (only custom agents) */}
                  {!isBuiltIn && (
                    <button
                      onClick={() => setDeleteConfirm(agent)}
                      title="Delete"
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Health indicator */}
                  {agent.enabled && (
                    healthy ? <CheckCircle2 className="w-5 h-5 text-green-500 ml-1" /> : <XCircle className="w-5 h-5 text-red-400 ml-1" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {agentRecords.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
            No agents configured. Click "Add Agent" to create one.
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {(showAddForm || editingAgent) && (
        <AgentFormModal
          agent={editingAgent}
          onClose={() => { setShowAddForm(false); setEditingAgent(null); }}
          onSaved={() => { setShowAddForm(false); setEditingAgent(null); onRefresh(); }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Agent</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete the agent <strong>"{deleteConfirm.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Agent Form Modal (Add / Edit) ───── */
function AgentFormModal({ agent, onClose, onSaved }: { agent: AgentRecord | null; onClose: () => void; onSaved: () => void }) {
  const isEditing = !!agent;
  const [name, setName] = useState(agent?.name || '');
  const [type, setType] = useState(agent?.type || 'llm');
  const [description, setDescription] = useState(agent?.description || '');
  const [configJson, setConfigJson] = useState(agent ? JSON.stringify(agent.config, null, 2) : '{}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const BUILT_IN = ['echo', 'cursor', 'llm'];
  const isBuiltIn = isEditing && BUILT_IN.includes(agent!.name);

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }

    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configJson);
    } catch {
      setError('Invalid JSON in config');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.agentControl.updateRecord(agent!.id, {
          name: isBuiltIn ? undefined : name.trim(),
          description: description.trim(),
          type,
          config,
        });
      } else {
        await api.agentControl.createRecord({
          name: name.trim(),
          type,
          description: description.trim(),
          config,
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {isEditing ? <Pencil className="w-5 h-5 text-primary-500" /> : <Plus className="w-5 h-5 text-primary-500" />}
            {isEditing ? 'Edit Agent' : 'Add New Agent'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Agent Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isBuiltIn}
              placeholder="e.g. my-custom-agent"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isBuiltIn && <p className="text-[10px] text-slate-400 mt-1">Built-in agent names cannot be changed</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Agent Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500"
            >
              <option value="llm">LLM</option>
              <option value="cursor">Cursor</option>
              <option value="echo">Echo</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe what this agent does..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 resize-none"
            />
          </div>

          {/* Config JSON */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Configuration (JSON)</label>
            <textarea
              value={configJson}
              onChange={e => setConfigJson(e.target.value)}
              rows={5}
              placeholder="{}"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 resize-none font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ───── Custom Tools Panel ─────
   ═══════════════════════════════════════════ */
function ToolsPanel({ tools, registeredTools, loading, onRefresh }: { tools: any[]; registeredTools: string[]; loading: boolean; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const builtInTools = registeredTools.filter(n => !tools.find(t => t.name === n) && !n.startsWith('mcp_'));
  const mcpTools = registeredTools.filter(n => n.startsWith('mcp_'));

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.admin.deleteTool(deleteId);
    setDeleteId(null);
    onRefresh();
  };

  const handleToggle = async (tool: any) => {
    await api.admin.updateTool(tool.id, { enabled: !tool.enabled });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-500" /> Tools
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowForm(true); setEditingTool(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Tool
          </button>
          <button onClick={onRefresh} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Built-in tools summary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Built-in Tools ({builtInTools.length})</p>
        <div className="flex flex-wrap gap-2">
          {builtInTools.map(name => (
            <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
              <Terminal className="w-3 h-3 text-slate-400" /> {name}
            </span>
          ))}
        </div>
        {mcpTools.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase mt-3 mb-2">MCP Tools ({mcpTools.length})</p>
            <div className="flex flex-wrap gap-2">
              {mcpTools.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-xs text-cyan-600 dark:text-cyan-400 font-mono">
                  <Plug className="w-3 h-3" /> {name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Custom tools list */}
      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Custom Tools ({tools.length})</p>
      <div className="space-y-2">
        {tools.map(tool => (
          <div key={tool.id} className={`rounded-xl border p-4 ${tool.enabled ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800 opacity-60'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tool.enabled ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {tool.implementation === 'http' ? <Globe className="w-4 h-4 text-orange-500" /> : <Terminal className="w-4 h-4 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-mono">{tool.name}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${tool.implementation === 'http' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{tool.implementation}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${tool.enabled ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>{tool.enabled ? 'on' : 'off'}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{tool.description}</p>
                {tool.shellCommand && <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">$ {tool.shellCommand}</p>}
                {tool.httpUrl && <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{tool.httpMethod || 'POST'} {tool.httpUrl}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditingTool(tool); setShowForm(false); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleToggle(tool)} className={`p-2 rounded-lg ${tool.enabled ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500' : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-400 hover:text-green-500'}`}>
                  {tool.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </button>
                <button onClick={() => setDeleteId(tool.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {tools.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
            No custom tools. Click "Add Tool" to create one.
          </div>
        )}
      </div>

      {(showForm || editingTool) && <ToolFormModal tool={editingTool} onClose={() => { setShowForm(false); setEditingTool(null); }} onSaved={() => { setShowForm(false); setEditingTool(null); onRefresh(); }} />}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4"><AlertCircle className="w-6 h-6 text-red-500" /><h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Tool</h3></div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">This will remove the custom tool permanently.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Tool Form Modal ───── */
function ToolFormModal({ tool, onClose, onSaved }: { tool: any | null; onClose: () => void; onSaved: () => void }) {
  const isEditing = !!tool;
  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [implementation, setImplementation] = useState<'shell' | 'http'>(tool?.implementation || 'shell');
  const [shellCommand, setShellCommand] = useState(tool?.shellCommand || '');
  const [httpUrl, setHttpUrl] = useState(tool?.httpUrl || '');
  const [httpMethod, setHttpMethod] = useState(tool?.httpMethod || 'POST');
  const [paramsJson, setParamsJson] = useState(tool?.parameters ? JSON.stringify(tool.parameters, null, 2) : '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }

    let parameters: any;
    try { parameters = JSON.parse(paramsJson); } catch { setError('Invalid parameters JSON'); return; }

    setSaving(true);
    try {
      const data = { name: name.trim(), description: description.trim(), implementation, shellCommand, httpUrl, httpMethod, parameters };
      if (isEditing) { await api.admin.updateTool(tool.id, data); }
      else { await api.admin.createTool(data); }
      onSaved();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" /> {isEditing ? 'Edit Tool' : 'Add Custom Tool'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Tool Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. get_weather" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 font-mono" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What does this tool do?" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Implementation</label>
            <div className="flex gap-2">
              <button onClick={() => setImplementation('shell')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${implementation === 'shell' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <Terminal className="w-4 h-4" /> Shell
              </button>
              <button onClick={() => setImplementation('http')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${implementation === 'http' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <Globe className="w-4 h-4" /> HTTP
              </button>
            </div>
          </div>

          {implementation === 'shell' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Shell Command</label>
              <input type="text" value={shellCommand} onChange={e => setShellCommand(e.target.value)} placeholder="echo ${input}" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 font-mono" />
              <p className="text-[10px] text-slate-400 mt-1">{"Use ${param_name} to inject parameters from the LLM call."}</p>
            </div>
          )}

          {implementation === 'http' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">HTTP Method</label>
                <select value={httpMethod} onChange={e => setHttpMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500">
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">URL</label>
                <input type="text" value={httpUrl} onChange={e => setHttpUrl(e.target.value)} placeholder="https://api.example.com/tool" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 font-mono" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Parameters (JSON Schema)</label>
            <textarea value={paramsJson} onChange={e => setParamsJson(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-primary-500 resize-none font-mono" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ───── MCP Servers Panel ─────
   ═══════════════════════════════════════════ */
function McpPanel({ servers, loading, onRefresh }: { servers: any[]; loading: boolean; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.admin.deleteMcp(deleteId);
    setDeleteId(null);
    onRefresh();
  };

  const handleConnect = async (id: string) => {
    setConnecting(id);
    try { await api.admin.connectMcp(id); } catch { /* ignore */ }
    setConnecting(null);
    onRefresh();
  };

  const handleDisconnect = async (id: string) => {
    setConnecting(id);
    try { await api.admin.disconnectMcp(id); } catch { /* ignore */ }
    setConnecting(null);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Plug className="w-5 h-5 text-cyan-500" /> MCP Servers
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowForm(true); setEditingServer(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Server
          </button>
          <button onClick={onRefresh} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50/50 dark:bg-cyan-900/10 p-4 mb-4">
        <p className="text-xs text-cyan-700 dark:text-cyan-400 leading-relaxed">
          <strong>Model Context Protocol (MCP)</strong> allows the agent to connect to external tool servers.
          Add an MCP server, then connect it to discover and register its tools automatically.
          Connected tools are available to the LLM agent during chat.
        </p>
      </div>

      <div className="space-y-3">
        {servers.map(server => (
          <div key={server.id} className={`rounded-xl border p-4 ${server.connected ? 'border-cyan-300 dark:border-cyan-700 bg-cyan-50/30 dark:bg-cyan-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${server.connected ? 'bg-cyan-100 dark:bg-cyan-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <Plug className={`w-5 h-5 ${server.connected ? 'text-cyan-500' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{server.name}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${server.transport === 'stdio' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>{server.transport}</span>
                  {server.connected ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> connected</span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">disconnected</span>
                  )}
                </div>
                {server.description && <p className="text-xs text-slate-500 mt-0.5">{server.description}</p>}
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  {server.transport === 'stdio' ? `$ ${server.command} ${(server.args || []).join(' ')}` : server.url || 'No URL'}
                </p>
                {server.connected && server.discoveredTools?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {server.discoveredTools.map((t: string) => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {server.connected ? (
                  <button onClick={() => handleDisconnect(server.id)} disabled={connecting === server.id} title="Disconnect" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 text-xs font-medium disabled:opacity-50">
                    {connecting === server.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />} Disconnect
                  </button>
                ) : (
                  <button onClick={() => handleConnect(server.id)} disabled={connecting === server.id} title="Connect" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 text-xs font-medium disabled:opacity-50">
                    {connecting === server.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />} Connect
                  </button>
                )}
                <button onClick={() => { setEditingServer(server); setShowForm(false); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDeleteId(server.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {servers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
            No MCP servers configured. Click "Add Server" to connect one.
          </div>
        )}
      </div>

      {(showForm || editingServer) && <McpFormModal server={editingServer} onClose={() => { setShowForm(false); setEditingServer(null); }} onSaved={() => { setShowForm(false); setEditingServer(null); onRefresh(); }} />}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4"><AlertCircle className="w-6 h-6 text-red-500" /><h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete MCP Server</h3></div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">This will disconnect and remove the server permanently.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── MCP Form Modal ───── */
function McpFormModal({ server, onClose, onSaved }: { server: any | null; onClose: () => void; onSaved: () => void }) {
  const isEditing = !!server;
  const [name, setName] = useState(server?.name || '');
  const [description, setDescription] = useState(server?.description || '');
  const [transport, setTransport] = useState<'stdio' | 'sse'>(server?.transport || 'stdio');
  const [command, setCommand] = useState(server?.command || '');
  const [args, setArgs] = useState((server?.args || []).join(' '));
  const [envJson, setEnvJson] = useState(server?.env ? JSON.stringify(server.env, null, 2) : '{}');
  const [url, setUrl] = useState(server?.url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }

    let env: Record<string, string> = {};
    try { env = JSON.parse(envJson); } catch { setError('Invalid env JSON'); return; }

    setSaving(true);
    try {
      const data = { name: name.trim(), description: description.trim(), transport, command: command.trim(), args: args.trim() ? args.trim().split(/\s+/) : [], env, url: url.trim() };
      if (isEditing) { await api.admin.updateMcp(server.id, data); }
      else { await api.admin.createMcp(data); }
      onSaved();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plug className="w-5 h-5 text-cyan-500" /> {isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Server Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. filesystem" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this server provide?" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Transport</label>
            <div className="flex gap-2">
              <button onClick={() => setTransport('stdio')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${transport === 'stdio' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <Terminal className="w-4 h-4" /> Stdio
              </button>
              <button onClick={() => setTransport('sse')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${transport === 'sse' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <Globe className="w-4 h-4" /> SSE
              </button>
            </div>
          </div>

          {transport === 'stdio' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Command</label>
                <input type="text" value={command} onChange={e => setCommand(e.target.value)} placeholder="e.g. npx, python, node" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Arguments (space-separated)</label>
                <input type="text" value={args} onChange={e => setArgs(e.target.value)} placeholder="e.g. -y @modelcontextprotocol/server-filesystem /path" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 font-mono" />
              </div>
            </>
          )}

          {transport === 'sse' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">SSE URL</label>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://localhost:8080/sse" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary-500 font-mono" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Environment Variables (JSON)</label>
            <textarea value={envJson} onChange={e => setEnvJson(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-primary-500 resize-none font-mono" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
