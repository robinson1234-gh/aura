import { useState } from 'react';
import { User, Bot, FileText, ChevronDown, ChevronUp, X, Info, Clock, Cpu, Wrench, FileCode, BrainCircuit, Layers } from 'lucide-react';
import { ToolCallBlock } from './ToolCallBlock';
import { TraceViewer } from './TraceViewer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { api } from '../../services/api';
import type { Message } from '../../types';

interface Props {
  message: Message;
  streamContent?: string;
}

interface LlmMeta { provider: string; model: string; baseUrl: string; maxTokens: number; temperature: number }
interface ConfigMeta { loaded: boolean; length?: number }
interface WorkflowMeta {
  agent?: string;
  summaryFileId?: string;
  timestamp?: string;
  durationMs?: number;
  workspace?: string;
  workingDirectory?: string | null;
  historyMessages?: number;
  toolCallCount?: number;
  toolNames?: string[];
  responseLength?: number;
  configs?: Record<string, ConfigMeta>;
  llm?: LlmMeta | null;
}

export function MessageBubble({ message, streamContent }: Props) {
  const isUser = message.role === 'user';
  const content = message.isStreaming ? (streamContent || '') : message.content;
  const toolCalls = message.toolCalls || [];
  const meta = (message.metadata || {}) as WorkflowMeta;
  const summaryFileId = meta.summaryFileId;

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);

  const traceSpans = message.traceSpans || [];
  const hasTrace = traceSpans.length > 0;

  const handleToggleSummary = async () => {
    if (summaryOpen) { setSummaryOpen(false); return; }
    if (summaryContent) { setSummaryOpen(true); return; }
    if (!summaryFileId) return;
    setSummaryLoading(true);
    try {
      const data = await api.summaries.get(summaryFileId);
      setSummaryContent(data.content);
      setSummaryOpen(true);
    } catch {
      setSummaryContent('Failed to load summary.');
      setSummaryOpen(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3">
        <div className="flex gap-3 max-w-[75%]">
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 bg-primary-500 text-white shadow-sm">
            <div className="text-sm whitespace-pre-wrap break-words">{content}</div>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary-500 text-white shadow-sm">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  const hasWorkflow = !!(meta.llm || meta.configs || meta.durationMs !== undefined);

  return (
    <div className="flex justify-start px-4 py-3">
      <div className="flex gap-3 max-w-[85%]">
        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <Bot className="w-4 h-4" />
        </div>

        <div className="min-w-0 overflow-hidden">
          {/* Header: agent badge + brief info + action buttons */}
          <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-2 flex-wrap">
            {meta.agent && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wide">
                {String(meta.agent)}
              </span>
            )}
            {meta.llm && (
              <span className="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-mono">
                {meta.llm.model}
              </span>
            )}
            {meta.durationMs != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Clock className="w-3 h-3" />
                {meta.durationMs < 1000 ? `${meta.durationMs}ms` : `${(meta.durationMs / 1000).toFixed(1)}s`}
              </span>
            )}
            {meta.toolCallCount != null && meta.toolCallCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Wrench className="w-3 h-3" />
                {meta.toolCallCount} tool{meta.toolCallCount > 1 ? 's' : ''}
              </span>
            )}

            {hasWorkflow && (
              <button
                onClick={() => setDetailOpen(!detailOpen)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Info className="w-3 h-3" />
                Advanced Detail
                {detailOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {hasTrace && (
              <button
                onClick={() => setTraceOpen(!traceOpen)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  traceOpen
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                }`}
              >
                <Layers className="w-3 h-3" />
                Trace ({traceSpans.length})
                {traceOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {summaryFileId && (
              <button
                onClick={handleToggleSummary}
                disabled={summaryLoading}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              >
                <FileText className="w-3 h-3" />
                {summaryLoading ? 'Loading...' : 'Detail Summary'}
                {summaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Advanced Detail Panel */}
          {detailOpen && hasWorkflow && (
            <div className="mb-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Workflow Detail
                </span>
                <button onClick={() => setDetailOpen(false)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="p-3 space-y-3">
                {/* LLM Section */}
                {meta.llm && (
                  <DetailSection icon={BrainCircuit} title="LLM Configuration" color="violet">
                    <DetailRow label="Provider" value={meta.llm.provider} />
                    <DetailRow label="Model" value={meta.llm.model} />
                    <DetailRow label="Base URL" value={meta.llm.baseUrl} mono />
                    <DetailRow label="Max Tokens" value={String(meta.llm.maxTokens)} />
                    <DetailRow label="Temperature" value={String(meta.llm.temperature)} />
                  </DetailSection>
                )}

                {/* Agent / Execution Section */}
                <DetailSection icon={Cpu} title="Execution" color="emerald">
                  <DetailRow label="Agent" value={meta.agent || 'unknown'} />
                  <DetailRow label="Duration" value={meta.durationMs != null ? (meta.durationMs < 1000 ? `${meta.durationMs}ms` : `${(meta.durationMs / 1000).toFixed(1)}s`) : '-'} />
                  <DetailRow label="Response Length" value={meta.responseLength != null ? `${meta.responseLength} chars` : '-'} />
                  <DetailRow label="Context Messages" value={meta.historyMessages != null ? String(meta.historyMessages) : '-'} />
                  <DetailRow label="Workspace" value={meta.workspace || '-'} mono />
                  <DetailRow label="Working Directory" value={meta.workingDirectory || '(not set)'} mono />
                  {meta.timestamp && <DetailRow label="Timestamp" value={new Date(meta.timestamp).toLocaleString()} />}
                </DetailSection>

                {/* Tools Section */}
                {meta.toolCallCount != null && meta.toolCallCount > 0 && (
                  <DetailSection icon={Wrench} title={`Tools Used (${meta.toolCallCount})`} color="amber">
                    <div className="flex flex-wrap gap-1.5">
                      {(meta.toolNames || []).map((name, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
                          {name}
                        </span>
                      ))}
                    </div>
                  </DetailSection>
                )}

                {/* Config Files Section */}
                {meta.configs && (
                  <DetailSection icon={FileCode} title="Configuration Files" color="sky">
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(meta.configs).map(([key, cfg]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${cfg.loaded ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <span className="text-slate-600 dark:text-slate-400 uppercase text-[10px] font-medium w-16">{key}.md</span>
                          {cfg.loaded ? (
                            <span className="text-green-600 dark:text-green-400 text-[10px]">{cfg.length} chars</span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">not set</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                )}
              </div>
            </div>
          )}

          {/* Trace viewer */}
          {traceOpen && hasTrace && (
            <div className="mb-3">
              <TraceViewer spans={traceSpans} />
            </div>
          )}

          {/* Tool calls */}
          {toolCalls.length > 0 && (
            <div className="mb-2">
              {toolCalls.map(tc => (
                <ToolCallBlock key={tc.toolCallId} toolCall={tc} />
              ))}
            </div>
          )}

          {/* Detail summary panel */}
          {summaryOpen && summaryContent && (
            <div className="mb-3 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/50 dark:bg-primary-900/20 p-3 max-h-96 overflow-y-auto scrollbar-thin relative">
              <button
                onClick={() => setSummaryOpen(false)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-primary-400" />
              </button>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent">
                <MarkdownRenderer content={summaryContent} />
              </div>
            </div>
          )}

          {/* Message content */}
          <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent">
              {content ? <MarkdownRenderer content={content} /> : null}
              {message.isStreaming && <span className="typing-cursor" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

const colorMap: Record<string, string> = {
  violet: 'text-violet-600 dark:text-violet-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  sky: 'text-sky-600 dark:text-sky-400',
};

function DetailSection({ icon: Icon, title, color, children }: { icon: typeof Info; title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 font-semibold mb-1.5 ${colorMap[color] || 'text-slate-600'}`}>
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="ml-5 space-y-0.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-slate-500 dark:text-slate-400 w-28 shrink-0">{label}</span>
      <span className={`text-slate-700 dark:text-slate-300 break-all ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  );
}
