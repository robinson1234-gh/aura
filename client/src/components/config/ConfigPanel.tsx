import { useEffect, useState } from 'react';
import { FileText, Brain, Save, X, Key, Bot, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { api } from '../../services/api';
import { LLMSettings } from './LLMSettings';
import { AgentSettings } from './AgentSettings';
import { WorkspaceSettings } from './WorkspaceSettings';

type Tab = 'workspace' | 'skill' | 'soul' | 'llm' | 'agents';

export function ConfigPanel({ onClose }: { onClose: () => void }) {
  const { activeWorkspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [resolvedSkills, setResolvedSkills] = useState('');
  const [resolvedSoul, setResolvedSoul] = useState('');

  useEffect(() => {
    if (!activeWorkspace || activeTab === 'llm' || activeTab === 'agents' || activeTab === 'workspace') return;
    loadContent();
    loadResolved();
  }, [activeWorkspace, activeTab]);

  const loadContent = async () => {
    if (!activeWorkspace) return;
    try {
      const data = activeTab === 'skill'
        ? await api.config.getSkill(activeWorkspace.path)
        : await api.config.getSoul(activeWorkspace.path);
      setContent(data.content);
      setOriginalContent(data.content);
    } catch {
      setContent('');
      setOriginalContent('');
    }
  };

  const loadResolved = async () => {
    if (!activeWorkspace) return;
    try {
      const resolved = await api.config.resolve(activeWorkspace.path);
      setResolvedSkills(resolved.skills);
      setResolvedSoul(resolved.soul);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!activeWorkspace) return;
    setSaving(true);
    try {
      if (activeTab === 'skill') {
        await api.config.saveSkill(activeWorkspace.path, content);
      } else {
        await api.config.saveSoul(activeWorkspace.path, content);
      }
      setOriginalContent(content);
      await loadResolved();
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = content !== originalContent;

  const tabButton = (tab: Tab, icon: React.ReactNode, label: string) => (
    <button
      className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors
        ${activeTab === tab
          ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      onClick={() => setActiveTab(tab)}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold">Settings</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {activeWorkspace && (
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 truncate" title={activeWorkspace.path}>
            {activeWorkspace.path}
          </p>
        </div>
      )}

      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabButton('agents', <Bot className="w-3.5 h-3.5" />, 'Agents')}
        {tabButton('llm', <Key className="w-3.5 h-3.5" />, 'LLM')}
        {tabButton('workspace', <FolderOpen className="w-3.5 h-3.5" />, 'Dir')}
        {tabButton('skill', <FileText className="w-3.5 h-3.5" />, 'Skills')}
        {tabButton('soul', <Brain className="w-3.5 h-3.5" />, 'Soul')}
      </div>

      {activeTab === 'agents' ? (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <AgentSettings />
        </div>
      ) : activeTab === 'llm' ? (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <LLMSettings />
        </div>
      ) : activeTab === 'workspace' ? (
        activeWorkspace ? (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            <WorkspaceSettings workspacePath={activeWorkspace.path} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-4">
            Select a workspace to set its directory
          </div>
        )
      ) : activeWorkspace ? (
        <>
          <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
            <div className="flex-1 min-h-0">
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                {activeTab === 'skill' ? 'SKILL.md' : 'SOUL.md'} (this level)
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full h-[calc(100%-24px)] resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono outline-none focus:border-primary-500 scrollbar-thin"
                placeholder={`Enter ${activeTab} content in Markdown...`}
              />
            </div>

            <div className="shrink-0">
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Resolved {activeTab} (inherited)
              </label>
              <div className="h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2 text-xs font-mono text-slate-500 scrollbar-thin whitespace-pre-wrap">
                {activeTab === 'skill' ? resolvedSkills : resolvedSoul || '(empty)'}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-4">
          Select a workspace to edit Skills/Soul
        </div>
      )}
    </div>
  );
}
