import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, FileText, ChevronDown, ChevronUp, X } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { api } from '../../services/api';
import type { Message } from '../../types';

interface Props {
  message: Message;
  streamContent?: string;
}

export function MessageBubble({ message, streamContent }: Props) {
  const isUser = message.role === 'user';
  const content = message.isStreaming ? (streamContent || '') : message.content;
  const toolCalls = message.toolCalls || [];
  const summaryFileId = message.metadata?.summaryFileId as string | undefined;

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleToggleSummary = async () => {
    if (summaryOpen) {
      setSummaryOpen(false);
      return;
    }
    if (summaryContent) {
      setSummaryOpen(true);
      return;
    }
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

  const briefSummary = !isUser && content && content.length > 300
    ? content.slice(0, 200).replace(/\n/g, ' ').trim() + '...'
    : null;

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

  return (
    <div className="flex justify-start px-4 py-3">
      <div className="flex gap-3 max-w-[85%]">
        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <Bot className="w-4 h-4" />
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-2">
            <span>Agent</span>
            {message.metadata?.agent && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono uppercase tracking-wide text-slate-500">
                {String(message.metadata.agent)}
              </span>
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

          {toolCalls.length > 0 && (
            <div className="mb-2">
              {toolCalls.map(tc => (
                <ToolCallBlock key={tc.toolCallId} toolCall={tc} />
              ))}
            </div>
          )}

          {summaryOpen && summaryContent && (
            <div className="mb-3 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/50 dark:bg-primary-900/20 p-3 max-h-96 overflow-y-auto scrollbar-thin relative">
              <button
                onClick={() => setSummaryOpen(false)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-primary-400" />
              </button>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent">
                <ReactMarkdown remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      if (match) return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
                      return <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono" {...props}>{children}</code>;
                    },
                  }}
                >
                  {summaryContent}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent">
              {content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');

                      if (match) {
                        return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
                      }

                      return (
                        <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-3">
                          <table className="min-w-full border border-slate-200 dark:border-slate-700 text-sm">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-left font-medium border-b border-slate-200 dark:border-slate-700">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                          {children}
                        </td>
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                          {children}
                        </a>
                      );
                    },
                    img({ src, alt }) {
                      return (
                        <img src={src} alt={alt} className="max-w-full rounded-lg border border-slate-200 dark:border-slate-700 my-2" />
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : null}
              {message.isStreaming && <span className="typing-cursor" />}
            </div>
          </div>

          {briefSummary && !summaryOpen && summaryFileId && (
            <div className="mt-2 text-xs text-slate-400 italic">
              {briefSummary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
