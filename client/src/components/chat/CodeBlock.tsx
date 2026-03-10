import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, PanelRightOpen, WrapText } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';

interface Props {
  language?: string;
  children: string;
  filename?: string;
}

export function CodeBlock({ language, children, filename }: Props) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const openCanvas = useCanvasStore((s) => s.openCanvas);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInCanvas = () => {
    openCanvas({
      title: filename || `${language || 'text'} snippet`,
      language: language || 'text',
      content: children,
      originalContent: children,
      type: 'code',
    });
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-slate-500 font-mono shrink-0">{language || 'text'}</span>
          {filename && (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate" title={filename}>
              {filename}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
              wrapLines
                ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/30'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title={wrapLines ? 'Unwrap lines' : 'Wrap lines'}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenInCanvas}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 px-1.5 py-0.5 rounded transition-colors"
            title="Open in Canvas"
          >
            <PanelRightOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5" /> Copied</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy</>
            )}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.8125rem',
          lineHeight: '1.5',
        }}
        showLineNumbers
        wrapLongLines={wrapLines}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
