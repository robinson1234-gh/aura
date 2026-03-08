import { useEffect, useState } from 'react';
import { FolderOpen, Save, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  workspacePath: string;
}

export function WorkspaceSettings({ workspacePath }: Props) {
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [originalDir, setOriginalDir] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, [workspacePath]);

  const loadSettings = async () => {
    try {
      const settings = await api.config.getSettings(workspacePath);
      const dir = (settings.workingDirectory as string) || '';
      setWorkingDirectory(dir);
      setOriginalDir(dir);
    } catch {
      setWorkingDirectory('');
      setOriginalDir('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.config.saveSettings(workspacePath, { workingDirectory: workingDirectory.trim() });
      setOriginalDir(workingDirectory.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = workingDirectory.trim() !== originalDir;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <FolderOpen className="w-4 h-4 text-primary-500" />
        Workspace Directory
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Set the local filesystem directory for this workspace. Tools and agents will use this as the working directory when executing tasks.
      </p>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Working Directory
        </label>
        <input
          value={workingDirectory}
          onChange={e => setWorkingDirectory(e.target.value)}
          placeholder="C:\Users\you\projects\my-project"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono outline-none focus:border-primary-500"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Absolute path. Supports paths with spaces.
        </p>
      </div>

      {originalDir && (
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
          Current: <span className="font-mono text-slate-700 dark:text-slate-300">{originalDir}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!isDirty || saving}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 text-sm font-medium transition-colors"
      >
        {saved ? <><Check className="w-4 h-4" /> Saved</> :
         saving ? 'Saving...' :
         <><Save className="w-4 h-4" /> Save</>}
      </button>

      <div className="text-[10px] text-slate-400 leading-relaxed pt-2 border-t border-slate-200 dark:border-slate-700">
        <p className="font-medium text-slate-500 mb-1">Examples:</p>
        <p className="font-mono">C:\Users\buaa_\Workspace\CodeSpace\firstProject</p>
        <p className="font-mono">C:\Users\buaa_\Workspace\CodeSpace\Quantitative Trading</p>
      </div>
    </div>
  );
}
