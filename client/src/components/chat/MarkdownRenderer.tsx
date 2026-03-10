import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ExternalLink, ZoomIn, X } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { MermaidBlock } from './MermaidBlock';

interface Props {
  content: string;
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function MarkdownRenderer({ content }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; alt: string } | null>(null);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          /* ── Headings ── */
          h1({ children }) {
            return (
              <h1 className="text-xl font-bold mt-5 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-lg font-semibold mt-5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-200 border-l-3 border-primary-500 pl-3">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return <h4 className="text-sm font-semibold mt-3 mb-1.5 text-slate-700 dark:text-slate-300">{children}</h4>;
          },
          h5({ children }) {
            return <h5 className="text-sm font-medium mt-3 mb-1 text-slate-600 dark:text-slate-400">{children}</h5>;
          },
          h6({ children }) {
            return <h6 className="text-xs font-medium mt-2 mb-1 text-slate-500 dark:text-slate-500 uppercase tracking-wide">{children}</h6>;
          },

          /* ── Paragraphs ── */
          p({ children }) {
            return <p className="my-2 leading-relaxed text-slate-700 dark:text-slate-300">{children}</p>;
          },

          /* ── Blockquote ── */
          blockquote({ children }) {
            return (
              <blockquote className="my-3 border-l-4 border-primary-400 dark:border-primary-600 pl-4 py-1 italic text-slate-600 dark:text-slate-400 bg-primary-50/30 dark:bg-primary-900/10 rounded-r-lg">
                {children}
              </blockquote>
            );
          },

          /* ── Horizontal Rule ── */
          hr() {
            return <hr className="my-6 border-slate-200 dark:border-slate-700" />;
          },

          /* ── Lists ── */
          ul({ children }) {
            return <ul className="my-2 ml-1 space-y-1 list-disc list-inside marker:text-primary-400">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 ml-1 space-y-1 list-decimal list-inside marker:text-primary-400">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-slate-700 dark:text-slate-300 leading-relaxed">{children}</li>;
          },

          /* ── Code ── */
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (match) {
              const lang = match[1];
              if (lang === 'mermaid') {
                return <MermaidBlock chart={codeString} />;
              }
              return <CodeBlock language={lang}>{codeString}</CodeBlock>;
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 text-[0.85em] font-mono border border-slate-200/50 dark:border-slate-700/50"
                {...props}
              >
                {children}
              </code>
            );
          },

          /* ── Tables ── */
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-50 dark:bg-slate-800/80">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors even:bg-slate-50/30 dark:even:bg-slate-800/20">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{children}</td>;
          },

          /* ── Links ── */
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline underline-offset-2 decoration-primary-300 dark:decoration-primary-700 hover:decoration-primary-500 transition-colors"
              >
                {children}
                <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
              </a>
            );
          },

          /* ── Images ── */
          img({ src, alt }) {
            if (!src) return null;
            return (
              <span className="group relative inline-block my-2">
                <img
                  src={src}
                  alt={alt || ''}
                  className="max-w-full rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLightboxSrc({ src, alt: alt || '' })}
                />
                <button
                  onClick={() => setLightboxSrc({ src, alt: alt || '' })}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </span>
            );
          },

          /* ── Strong / Em ── */
          strong({ children }) {
            return <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-slate-600 dark:text-slate-400">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc.src} alt={lightboxSrc.alt} onClose={closeLightbox} />
      )}
    </>
  );
}
