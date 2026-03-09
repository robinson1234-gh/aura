import { useState, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, Clock, BrainCircuit, Wrench,
  Link2, Layers, AlertCircle, CheckCircle2, Loader2,
  Zap, Hash, ArrowRight,
} from 'lucide-react';
import type { TraceSpan, TraceSpanKind } from '../../types';

interface Props {
  spans: TraceSpan[];
}

interface TreeNode {
  span: TraceSpan;
  children: TreeNode[];
  depth: number;
}

function buildTree(spans: TraceSpan[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  const deduped = new Map<string, TraceSpan>();
  for (const s of spans) {
    const existing = deduped.get(s.spanId);
    if (!existing || (s.endTime && !existing.endTime) || (s.status !== 'running' && existing.status === 'running')) {
      deduped.set(s.spanId, s);
    }
  }

  for (const span of deduped.values()) {
    map.set(span.spanId, { span, children: [], depth: 0 });
  }

  for (const node of map.values()) {
    if (node.span.parentSpanId && map.has(node.span.parentSpanId)) {
      const parent = map.get(node.span.parentSpanId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.span.startTime - b.span.startTime);
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

const KIND_CONFIG: Record<TraceSpanKind, { icon: typeof BrainCircuit; color: string; bg: string; label: string }> = {
  chain:     { icon: Link2,        color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',    label: 'CHAIN' },
  llm:       { icon: BrainCircuit, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800', label: 'LLM' },
  tool:      { icon: Wrench,       color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',   label: 'TOOL' },
  retriever: { icon: Layers,       color: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',     label: 'RETRIEVER' },
  agent:     { icon: Zap,          color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', label: 'AGENT' },
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  running: Loader2,
  completed: CheckCircle2,
  error: AlertCircle,
};

function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '...';
}

function SpanRow({ node, globalStart, globalEnd }: { node: TreeNode; globalStart: number; globalEnd: number }) {
  const [expanded, setExpanded] = useState(node.depth < 2);
  const [detailTab, setDetailTab] = useState<'input' | 'output' | 'metadata'>('input');
  const [showDetail, setShowDetail] = useState(false);

  const { span } = node;
  const kc = KIND_CONFIG[span.kind] || KIND_CONFIG.chain;
  const KindIcon = kc.icon;
  const StatusIcon = STATUS_ICON[span.status] || CheckCircle2;
  const duration = span.endTime && span.startTime ? span.endTime - span.startTime : null;
  const hasChildren = node.children.length > 0;
  const hasDetail = !!(span.input || span.output || span.metadata || span.error || span.tokenUsage);

  const totalRange = globalEnd - globalStart || 1;
  const barLeft = ((span.startTime - globalStart) / totalRange) * 100;
  const barWidth = duration ? Math.max((duration / totalRange) * 100, 0.5) : 1;

  const statusColor = span.status === 'error' ? 'text-red-500' : span.status === 'running' ? 'text-amber-500 animate-spin' : 'text-green-500';

  return (
    <div>
      {/* Main row */}
      <div
        className={`group flex items-center gap-1 py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border-l-2 ${
          span.status === 'error' ? 'border-l-red-400' : span.status === 'running' ? 'border-l-amber-400' : 'border-l-transparent'
        }`}
        style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={`w-4 h-4 flex items-center justify-center shrink-0 ${hasChildren ? 'text-slate-400 hover:text-slate-600' : 'invisible'}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Kind badge */}
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border shrink-0 ${kc.bg}`}>
          <KindIcon className={`w-3 h-3 ${kc.color}`} />
          <span className={kc.color}>{kc.label}</span>
        </span>

        {/* Name */}
        <button
          onClick={() => hasDetail && setShowDetail(!showDetail)}
          className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate min-w-0 hover:underline"
          title={span.name}
        >
          {span.name}
        </button>

        {/* Status */}
        <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusColor}`} />

        {/* Timeline bar */}
        <div className="flex-1 min-w-[80px] h-5 bg-slate-100 dark:bg-slate-800 rounded-sm relative mx-1 overflow-hidden">
          <div
            className={`absolute top-0.5 bottom-0.5 rounded-sm ${
              span.status === 'error' ? 'bg-red-300 dark:bg-red-700' : span.status === 'running' ? 'bg-amber-300 dark:bg-amber-700 animate-pulse' : 'bg-blue-300 dark:bg-blue-600'
            }`}
            style={{ left: `${barLeft}%`, width: `${Math.min(barWidth, 100 - barLeft)}%` }}
          />
        </div>

        {/* Duration */}
        <span className="text-[10px] font-mono text-slate-500 shrink-0 w-14 text-right flex items-center justify-end gap-0.5">
          <Clock className="w-3 h-3" />
          {duration != null ? formatDuration(duration) : '...'}
        </span>

        {/* Tokens */}
        {span.tokenUsage?.totalTokens && (
          <span className="text-[10px] font-mono text-violet-500 shrink-0 flex items-center gap-0.5 ml-1">
            <Hash className="w-3 h-3" />
            {span.tokenUsage.totalTokens}
          </span>
        )}
      </div>

      {/* Detail panel */}
      {showDetail && hasDetail && (
        <div className="ml-8 mr-2 mb-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden" style={{ marginLeft: `${node.depth * 20 + 28}px` }}>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            {(['input', 'output', 'metadata'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  detailTab === tab
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-white dark:bg-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-3 max-h-64 overflow-y-auto scrollbar-thin">
            {detailTab === 'input' && (
              <div>
                {span.input ? (
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words">
                    {formatJsonSafe(span.input)}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-400 italic">No input</p>
                )}
              </div>
            )}

            {detailTab === 'output' && (
              <div>
                {span.error ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <pre className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">{span.error}</pre>
                  </div>
                ) : span.output ? (
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words">
                    {formatJsonSafe(span.output)}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-400 italic">{span.status === 'running' ? 'In progress...' : 'No output'}</p>
                )}
              </div>
            )}

            {detailTab === 'metadata' && (
              <div className="space-y-2">
                {span.tokenUsage && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Tokens:</span>
                    {span.tokenUsage.promptTokens != null && <span className="font-mono text-violet-600">prompt: {span.tokenUsage.promptTokens}</span>}
                    {span.tokenUsage.completionTokens != null && (
                      <>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-mono text-violet-600">completion: {span.tokenUsage.completionTokens}</span>
                      </>
                    )}
                    {span.tokenUsage.totalTokens != null && <span className="font-mono text-violet-500 font-semibold">total: {span.tokenUsage.totalTokens}</span>}
                  </div>
                )}
                {duration != null && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Duration:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{formatDuration(duration)}</span>
                    <span className="text-slate-400">({duration}ms)</span>
                  </div>
                )}
                {span.metadata && Object.keys(span.metadata).length > 0 && (
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800/50 rounded p-2">
                    {JSON.stringify(span.metadata, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Children */}
      {expanded && node.children.map(child => (
        <SpanRow key={child.span.spanId} node={child} globalStart={globalStart} globalEnd={globalEnd} />
      ))}
    </div>
  );
}

function formatJsonSafe(s: string): string {
  try {
    const parsed = JSON.parse(s);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return s;
  }
}

export function TraceViewer({ spans }: Props) {
  const tree = useMemo(() => buildTree(spans), [spans]);

  const { globalStart, globalEnd } = useMemo(() => {
    let min = Infinity, max = 0;
    for (const s of spans) {
      if (s.startTime && s.startTime < min) min = s.startTime;
      const end = s.endTime || Date.now();
      if (end > max) max = end;
    }
    return { globalStart: min === Infinity ? 0 : min, globalEnd: max || Date.now() };
  }, [spans]);

  const totalDuration = globalEnd - globalStart;
  const runningCount = spans.filter(s => s.status === 'running').length;
  const errorCount = spans.filter(s => s.status === 'error').length;

  const deduped = new Map<string, TraceSpan>();
  for (const s of spans) {
    const ex = deduped.get(s.spanId);
    if (!ex || s.status !== 'running') deduped.set(s.spanId, s);
  }
  const uniqueSpanCount = deduped.size;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Task Trace</span>
          <span className="text-[10px] text-slate-400 font-mono">{uniqueSpanCount} span{uniqueSpanCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          {runningCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> {runningCount} running
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
              <AlertCircle className="w-3 h-3" /> {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {formatDuration(totalDuration)}
          </span>
        </div>
      </div>

      {/* Span rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[500px] overflow-y-auto scrollbar-thin">
        {tree.map(node => (
          <SpanRow key={node.span.spanId} node={node} globalStart={globalStart} globalEnd={globalEnd} />
        ))}
      </div>
    </div>
  );
}
