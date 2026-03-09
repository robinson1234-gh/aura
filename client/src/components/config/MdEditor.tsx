import { useEffect, useState } from 'react';
import { Save, RotateCcw, Check, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  workspacePath: string;
  filename: string;
  title: string;
  description: string;
  placeholder: string;
}

export function MdEditor({ workspacePath, filename, title, description, placeholder }: Props) {
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [resolved, setResolved] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showGenerate, setShowGenerate] = useState(false);
  const [genDescription, setGenDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    load();
  }, [workspacePath, filename]);

  const load = async () => {
    try {
      const data = await api.config.getFile(workspacePath, filename);
      setContent(data.content);
      setOriginal(data.content);
    } catch {
      setContent('');
      setOriginal('');
    }
    loadResolved();
  };

  const loadResolved = async () => {
    try {
      const config = await api.config.resolve(workspacePath);
      const key = filename.replace('.md', '').replace('SKILL', 'skills').replace('SOUL', 'soul').replace('AGENT', 'agent').replace('IDENTITY', 'identity').replace('MEMORY', 'memory').replace('USER', 'user').toLowerCase();
      setResolved((config as any)[key] || '');
    } catch {
      setResolved('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.config.saveFile(workspacePath, filename, content);
      setOriginal(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadResolved();
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!genDescription.trim()) return;
    setGenerating(true);
    setGenError('');
    try {
      const result = await api.config.generate(workspacePath, filename, genDescription.trim());
      setContent(result.content);
      setShowGenerate(false);
      setGenDescription('');
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const isDirty = content !== original;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Workspace: {workspacePath} / {filename}
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(!showGenerate)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
            showGenerate
              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
              : 'bg-violet-500 hover:bg-violet-600 text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {showGenerate ? 'Cancel' : 'AI Generate'}
        </button>
      </div>

      {showGenerate && (
        <div className="mb-4 border border-violet-200 dark:border-violet-800 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 p-4">
          <label className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-2 block">
            Describe what you need
          </label>
          <p className="text-xs text-violet-500 dark:text-violet-400 mb-3">
            Briefly describe your project, domain, or requirements. The LLM will generate a complete {filename} for you.
          </p>
          <textarea
            value={genDescription}
            onChange={e => setGenDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
            placeholder={`e.g. "A React + Node.js e-commerce platform with TypeScript, Tailwind, and PostgreSQL"`}
            className="w-full h-24 resize-none rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 scrollbar-thin"
          />
          {genError && (
            <p className="mt-2 text-xs text-red-500">{genError}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || !genDescription.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 text-sm font-medium transition-colors"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate'}
            </button>
            <span className="text-xs text-slate-400">Ctrl+Enter to submit</span>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2">
            {filename}
            <span className="text-[10px] text-slate-400">(this level)</span>
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="flex-1 w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-mono outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 scrollbar-thin"
            placeholder={placeholder}
          />
        </div>

        {resolved && (
          <div className="w-80 flex flex-col min-h-0">
            <label className="text-xs font-medium text-slate-500 mb-1.5">
              Resolved (inherited)
            </label>
            <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-xs font-mono text-slate-500 scrollbar-thin whitespace-pre-wrap">
              {resolved}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 text-sm font-medium transition-colors"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
        {isDirty && (
          <button
            onClick={() => setContent(original)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Discard
          </button>
        )}
      </div>
    </div>
  );
}
