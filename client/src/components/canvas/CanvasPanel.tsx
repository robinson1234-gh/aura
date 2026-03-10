import { useState, useRef, useCallback, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  X, Copy, Check, Download, Send, RotateCcw, Pencil, Eye,
  PanelRightClose, FileCode, FileText, GitCompare,
} from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useSessionStore } from '../../stores/sessionStore';
import { MarkdownRenderer } from '../chat/MarkdownRenderer';
import { MermaidBlock } from '../chat/MermaidBlock';
import type { CanvasItem } from '../../stores/canvasStore';

export function CanvasPanel() {
  const { items, activeItemId, setActiveItem, removeItem, closeCanvas, updateContent } = useCanvasStore();
  const sendMessage = useSessionStore((s) => s.sendMessage);
  const activeItem = items.find((i) => i.id === activeItemId) || null;

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeItem) {
      setEditValue(activeItem.content);
      setEditing(false);
    }
  }, [activeItemId]);

  const handleStartEdit = useCallback(() => {
    if (!activeItem) return;
    setEditValue(activeItem.content);
    setEditing(true);
  }, [activeItem]);

  const handleSaveEdit = useCallback(() => {
    if (!activeItem) return;
    updateContent(activeItem.id, editValue);
    setEditing(false);
  }, [activeItem, editValue, updateContent]);

  const handleCancelEdit = useCallback(() => {
    if (!activeItem) return;
    setEditValue(activeItem.content);
    setEditing(false);
  }, [activeItem]);

  const handleCopy = useCallback(async () => {
    if (!activeItem) return;
    await navigator.clipboard.writeText(activeItem.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeItem]);

  const handleDownload = useCallback(() => {
    if (!activeItem) return;
    const ext = getExtension(activeItem.language);
    const filename = activeItem.title.includes('.') ? activeItem.title : `${activeItem.title}.${ext}`;
    const blob = new Blob([activeItem.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeItem]);

  const handleSendToChat = useCallback(() => {
    if (!activeItem) return;
    const wrapped = `\`\`\`${activeItem.language}\n${activeItem.content}\n\`\`\``;
    sendMessage(wrapped);
  }, [activeItem, sendMessage]);

  const handleReset = useCallback(() => {
    if (!activeItem) return;
    updateContent(activeItem.id, activeItem.originalContent);
    setEditValue(activeItem.originalContent);
  }, [activeItem, updateContent]);

  const isModified = activeItem ? activeItem.content !== activeItem.originalContent : false;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-900 border-l border-slate-200 dark:border-slate-700">
      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-950 overflow-x-auto scrollbar-thin">
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`group flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-r border-slate-200 dark:border-slate-700 shrink-0 transition-colors ${
                item.id === activeItemId
                  ? 'bg-white dark:bg-surface-900 text-slate-800 dark:text-slate-200'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.type === 'code' ? (
                <FileCode className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate max-w-[120px]">{item.title}</span>
              {item.content !== item.originalContent && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
        <button
          onClick={closeCanvas}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          title="Close Canvas"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {!activeItem ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          No artifact selected
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-950/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {activeItem.language}
              </span>
              {isModified && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20">
                  <GitCompare className="w-3 h-3" />
                  Modified
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!editing ? (
                <ToolbarButton icon={Pencil} label="Edit" onClick={handleStartEdit} />
              ) : (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="text-xs px-2.5 py-1 rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs px-2 py-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              {isModified && <ToolbarButton icon={RotateCcw} label="Reset" onClick={handleReset} />}
              <ToolbarButton icon={copied ? Check : Copy} label={copied ? 'Copied' : 'Copy'} onClick={handleCopy} />
              <ToolbarButton icon={Download} label="Download" onClick={handleDownload} />
              <ToolbarButton icon={Send} label="Send to Chat" onClick={handleSendToChat} />
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {editing ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-full p-4 bg-slate-900 text-slate-100 font-mono text-sm resize-none outline-none leading-relaxed"
                spellCheck={false}
              />
            ) : activeItem.type === 'diagram' ? (
              <div className="p-4">
                <MermaidBlock chart={activeItem.content} />
              </div>
            ) : activeItem.type === 'document' ? (
              <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={activeItem.content} />
              </div>
            ) : (
              <SyntaxHighlighter
                language={activeItem.language || 'text'}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: '0.8125rem',
                  lineHeight: '1.6',
                  minHeight: '100%',
                }}
                showLineNumbers
              >
                {activeItem.content}
              </SyntaxHighlighter>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, onClick }: { icon: typeof Copy; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function getExtension(language: string): string {
  const map: Record<string, string> = {
    typescript: 'ts', javascript: 'js', python: 'py', rust: 'rs',
    go: 'go', java: 'java', cpp: 'cpp', c: 'c', ruby: 'rb',
    php: 'php', swift: 'swift', kotlin: 'kt', scala: 'scala',
    html: 'html', css: 'css', scss: 'scss', json: 'json',
    yaml: 'yaml', yml: 'yml', xml: 'xml', sql: 'sql',
    shell: 'sh', bash: 'sh', markdown: 'md', text: 'txt',
  };
  return map[language] || 'txt';
}
