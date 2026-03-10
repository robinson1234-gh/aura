import { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
});

interface Props {
  chart: string;
}

export function MermaidBlock({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const stableId = `mermaid-${reactId.replace(/:/g, '')}`;
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const isDark = document.documentElement.classList.contains('dark');
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    });

    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(stableId, chart.trim());
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to render diagram');
          setSvg('');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [chart, stableId]);

  if (error) {
    return (
      <div className="my-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
        <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Mermaid diagram error</div>
        <pre className="text-xs text-red-500 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 flex items-center justify-center p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="text-sm text-slate-400 animate-pulse">Rendering diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 flex justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
