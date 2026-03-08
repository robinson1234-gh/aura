import { useState, useEffect, useRef } from 'react';
import { FolderOpen, X, Search } from 'lucide-react';

interface Props {
  open: boolean;
  onConfirm: (workingDirectory?: string) => void;
  onCancel: () => void;
}

const RECENT_DIRS_KEY = 'workagent:recentDirs';

function loadRecentDirs(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_DIRS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentDir(dir: string) {
  const recent = loadRecentDirs().filter(d => d !== dir);
  recent.unshift(dir);
  localStorage.setItem(RECENT_DIRS_KEY, JSON.stringify(recent.slice(0, 10)));
}

export function NewChatDialog({ open, onConfirm, onCancel }: Props) {
  const [workDir, setWorkDir] = useState('');
  const [recentDirs, setRecentDirs] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setWorkDir('');
      setRecentDirs(loadRecentDirs());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  const handleSubmit = () => {
    const dir = workDir.trim();
    if (dir) {
      saveRecentDir(dir);
      onConfirm(dir);
    } else {
      onConfirm(undefined);
    }
  };

  const handleBrowse = () => {
    folderInputRef.current?.click();
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const path = (files[0] as any).webkitRelativePath || files[0].name;
      const dir = path.split('/')[0] || path;
      setWorkDir(dir);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">New Chat</h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Working Folder <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <p className="text-xs text-slate-400 mb-2">
          The folder the agent will operate in. Leave empty to create a chat without a specific folder scope.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={workDir}
            onChange={e => setWorkDir(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="C:\Users\you\Projects\my-project"
            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono"
          />
          <button
            onClick={handleBrowse}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Browse folder"
          >
            <Search className="w-4 h-4 text-slate-500" />
          </button>
          <input
            ref={folderInputRef}
            type="file"
            /* @ts-expect-error webkitdirectory is not in standard types */
            webkitdirectory=""
            className="hidden"
            onChange={handleFolderSelect}
          />
        </div>

        {recentDirs.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-400 mb-1.5">Recent folders</p>
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              {recentDirs.map(dir => (
                <button
                  key={dir}
                  onClick={() => { setWorkDir(dir); }}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 truncate transition-colors"
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            Create Chat
          </button>
        </div>
      </div>
    </div>
  );
}
