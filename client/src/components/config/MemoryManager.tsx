import { useEffect, useState } from 'react';
import {
  Brain, Plus, Trash2, Save, X, BookOpen, Lightbulb, Cog,
  AlertCircle, CheckCircle2, Clock, Edit2, Hash,
} from 'lucide-react';
import { api } from '../../services/api';

interface MemoryEntry {
  id: string;
  workspacePath: string;
  category: 'semantic' | 'episodic' | 'procedural';
  content: string;
  source: 'auto' | 'manual' | 'system';
  relevance: number;
  accessCount: number;
  lastAccessed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  workspacePath: string;
}

const CATEGORY_CONFIG = {
  semantic: { icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', label: 'Knowledge', description: 'Facts, decisions, technical details' },
  episodic: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'Experience', description: 'Past events, outcomes, problems & solutions' },
  procedural: { icon: Cog, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', label: 'Preferences', description: 'User preferences, workflow patterns, coding style' },
} as const;

type Category = keyof typeof CATEGORY_CONFIG;

export function MemoryManager({ workspacePath }: Props) {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [showInherited, setShowInherited] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('semantic');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('semantic');
  const [resolvedContext, setResolvedContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { load(); }, [workspacePath, showInherited]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.memory.list(workspacePath, !showInherited);
      setMemories(data);
    } catch { setMemories([]); }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    await api.memory.create(workspacePath, newCategory, newContent.trim());
    setNewContent('');
    setAdding(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editingId || !editContent.trim()) return;
    await api.memory.update(editingId, editContent.trim(), editCategory);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.memory.delete(id);
    setDeleteConfirm(null);
    load();
  };

  const handleShowContext = async () => {
    if (showContext) { setShowContext(false); return; }
    try {
      const data = await api.memory.getContext(workspacePath);
      setResolvedContext(data.context);
      setShowContext(true);
    } catch {
      setResolvedContext('No context available');
      setShowContext(true);
    }
  };

  const startEdit = (m: MemoryEntry) => {
    setEditingId(m.id);
    setEditContent(m.content);
    setEditCategory(m.category);
  };

  const filtered = filter === 'all' ? memories : memories.filter(m => m.category === filter);

  const counts = {
    all: memories.length,
    semantic: memories.filter(m => m.category === 'semantic').length,
    episodic: memories.filter(m => m.category === 'episodic').length,
    procedural: memories.filter(m => m.category === 'procedural').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-500" />
          Memory Manager
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Long-term memory automatically extracted from conversations. Memories are injected into the LLM context for personalized responses.
        </p>
        <p className="text-xs text-slate-400 mt-0.5 font-mono">Workspace: {workspacePath}</p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Category filters */}
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All ({counts.all})
        </button>
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === cat ? `${cfg.bg} border ${cfg.color}` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label} ({counts[cat]})
            </button>
          );
        })}

        <div className="flex-1" />

        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showInherited} onChange={e => setShowInherited(e.target.checked)} className="rounded border-slate-300" />
          Include inherited
        </label>

        <button
          onClick={handleShowContext}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showContext ? 'Hide' : 'Preview'} Context
        </button>

        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Memory
        </button>
      </div>

      {/* Resolved context preview */}
      {showContext && (
        <div className="mb-4 border border-violet-200 dark:border-violet-800 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 p-4 max-h-64 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Resolved Memory Context (injected into LLM)</span>
            <button onClick={() => setShowContext(false)} className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-800">
              <X className="w-3.5 h-3.5 text-violet-400" />
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{resolvedContext || '(empty — no memories yet)'}</pre>
        </div>
      )}

      {/* Add new memory form */}
      {adding && (
        <div className="mb-4 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/50 dark:bg-primary-900/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as Category)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 outline-none"
            >
              <option value="semantic">Knowledge / Facts</option>
              <option value="episodic">Experience / Events</option>
              <option value="procedural">Preferences / Patterns</option>
            </select>
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Enter a memory... e.g. 'The project uses React 18 with TypeScript and Tailwind CSS'"
            className="w-full h-20 resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAdd(); }}
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={handleAdd} disabled={!newContent.trim()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 text-white disabled:text-slate-500 text-xs font-medium">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button onClick={() => { setAdding(false); setNewContent(''); }} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700">
              Cancel
            </button>
            <span className="text-[10px] text-slate-400">Ctrl+Enter to add</span>
          </div>
        </div>
      )}

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading memories...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No memories yet</p>
            <p className="text-xs text-slate-400 mt-1">Memories will be automatically extracted from conversations, or you can add them manually.</p>
          </div>
        ) : (
          filtered.map(m => {
            const cfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.semantic;
            const Icon = cfg.icon;
            const isEditing = editingId === m.id;
            const isDeleting = deleteConfirm === m.id;

            return (
              <div key={m.id} className={`border rounded-lg p-3 transition-colors ${cfg.bg}`}>
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div>
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value as Category)}
                          className="text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 mb-2 outline-none"
                        >
                          <option value="semantic">Knowledge</option>
                          <option value="episodic">Experience</option>
                          <option value="procedural">Preferences</option>
                        </select>
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="w-full h-16 resize-none rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm outline-none focus:border-primary-500"
                          autoFocus
                        />
                        <div className="flex gap-1 mt-1">
                          <button onClick={handleUpdate} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary-500 text-white hover:bg-primary-600">
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{m.content}</p>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                        <span className={`font-medium uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                        <span className="flex items-center gap-0.5">
                          {m.source === 'auto' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Edit2 className="w-3 h-3" />}
                          {m.source}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Hash className="w-3 h-3" />
                          used {m.accessCount}x
                        </span>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        {m.workspacePath !== workspacePath && (
                          <span className="font-mono text-slate-400" title="Inherited from parent workspace">
                            ↑ {m.workspacePath}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(m)} className="p-1 rounded hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(m.id)} className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-medium">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px]">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(m.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: info */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          <strong>Automatic extraction</strong>: After each conversation, the system analyzes the exchange and extracts useful facts, decisions, and preferences. 
          <strong> Three memory types</strong>: Semantic (knowledge), Episodic (experiences), Procedural (preferences). 
          <strong> Conversation summaries</strong>: Long sessions are automatically summarized so older context isn't lost. 
          All memories are injected into the LLM system prompt.
        </p>
      </div>
    </div>
  );
}
