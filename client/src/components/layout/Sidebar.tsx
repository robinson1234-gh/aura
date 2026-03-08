import { Bot } from 'lucide-react';
import { WorkspaceTree } from '../workspace/WorkspaceTree';
import { SessionList } from '../session/SessionList';
import { ThemeToggle } from '../common/ThemeToggle';

export function Sidebar() {
  return (
    <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold">WorkAgent</h1>
          <p className="text-[10px] text-slate-400">AI Agent Platform</p>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <WorkspaceTree />
        <div className="border-t border-slate-200 dark:border-slate-700 mt-2">
          <SessionList />
        </div>
      </div>
    </div>
  );
}
