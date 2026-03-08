import { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Loader2, CheckCircle2,
  FileEdit, Terminal, Search, FolderOpen, Eye, Code, Wrench,
} from 'lucide-react';
import type { ToolCallInfo } from '../../types';

interface Props {
  toolCall: ToolCallInfo;
}

const TOOL_ICONS: Record<string, typeof Wrench> = {
  read_file: Eye,
  write_file: FileEdit,
  edit_file: FileEdit,
  list_directory: FolderOpen,
  search_files: Search,
  shell: Terminal,
  run_command: Terminal,
  bash: Terminal,
  cursor_agent: Code,
};

function getToolIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(TOOL_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Wrench;
}

function getToolSummary(name: string, args: string): string | null {
  try {
    const parsed = JSON.parse(args);
    const lower = name.toLowerCase();

    if (lower.includes('read_file') || lower.includes('edit_file') || lower.includes('write_file')) {
      return parsed.path || parsed.file_path || parsed.filename || null;
    }
    if (lower.includes('list_directory') || lower.includes('list_dir')) {
      return parsed.path || parsed.directory || null;
    }
    if (lower.includes('search')) {
      const query = parsed.query || parsed.pattern || parsed.regex || '';
      const dir = parsed.path || parsed.directory || '';
      return query ? `"${query}"${dir ? ` in ${dir}` : ''}` : null;
    }
    if (lower.includes('shell') || lower.includes('bash') || lower.includes('run_command') || lower.includes('command')) {
      return parsed.command || parsed.cmd || null;
    }
    if (lower.includes('cursor')) {
      const task = parsed.task || '';
      return task.length > 80 ? task.slice(0, 80) + '...' : task || null;
    }
  } catch { /* ignore parse errors */ }
  return null;
}

export function ToolCallBlock({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);

  const isRunning = toolCall.status === 'running';
  const isCompleted = toolCall.status === 'completed';
  const ToolIcon = getToolIcon(toolCall.toolName);
  const summary = getToolSummary(toolCall.toolName, toolCall.arguments);

  useEffect(() => {
    if (isRunning) setExpanded(true);
  }, [isRunning]);

  let parsedArgs: string;
  try {
    parsedArgs = JSON.stringify(JSON.parse(toolCall.arguments), null, 2);
  } catch {
    parsedArgs = toolCall.arguments;
  }

  return (
    <div className={`my-2 rounded-lg border overflow-hidden text-sm transition-colors ${
      isRunning
        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10'
        : 'border-slate-200 dark:border-slate-700'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        }

        {isRunning
          ? <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
          : isCompleted
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <ToolIcon className="w-4 h-4 text-slate-400 shrink-0" />
        }

        <span className="font-medium text-slate-700 dark:text-slate-300">
          {toolCall.toolName}
        </span>

        {summary && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[300px]">
            {summary}
          </span>
        )}

        <span className="text-xs text-slate-400 ml-auto shrink-0">
          {isRunning ? 'Running...' : isCompleted ? 'Done' : toolCall.status}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          <div className="px-3 py-2">
            <div className="text-xs font-medium text-slate-500 mb-1">Arguments</div>
            <pre className="text-xs bg-slate-100 dark:bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto">
              {parsedArgs}
            </pre>
          </div>

          {toolCall.result && (
            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs font-medium text-slate-500 mb-1">Result</div>
              <pre className="text-xs bg-slate-100 dark:bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto">
                {toolCall.result.length > 5000 ? toolCall.result.slice(0, 5000) + '\n... (truncated)' : toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
