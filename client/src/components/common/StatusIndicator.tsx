import type { AgentStatus } from '../../types';

const statusConfig: Record<AgentStatus, { color: string; label: string; animate?: boolean }> = {
  idle: { color: 'bg-emerald-500', label: 'Ready' },
  thinking: { color: 'bg-amber-400', label: 'Thinking...', animate: true },
  executing: { color: 'bg-blue-500', label: 'Executing...', animate: true },
  error: { color: 'bg-red-500', label: 'Error' },
};

interface Props {
  status: AgentStatus;
  detail?: string;
}

export function StatusIndicator({ status, detail }: Props) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-2.5 w-2.5">
        {config.animate && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.color}`} />
      </span>
      <span className="text-slate-500 dark:text-slate-400">
        {detail || config.label}
      </span>
    </div>
  );
}
