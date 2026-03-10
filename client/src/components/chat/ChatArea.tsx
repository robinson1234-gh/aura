import { useState, useCallback, useRef, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { ChatTabs } from './ChatTabs';
import { ChatPanel } from './ChatPanel';
import { CanvasPanel } from '../canvas/CanvasPanel';
import { useSessionStore } from '../../stores/sessionStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useCanvasStore } from '../../stores/canvasStore';

export function ChatArea() {
  const { openSessionIds, activeSessionId } = useSessionStore();
  const { activeWorkspace } = useWorkspaceStore();
  const canvasOpen = useCanvasStore((s) => s.isOpen);
  const canvasItems = useCanvasStore((s) => s.items);

  const [canvasWidth, setCanvasWidth] = useState(45);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = ((rect.width - x) / rect.width) * 100;
      setCanvasWidth(Math.max(20, Math.min(70, pct)));
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const showCanvas = canvasOpen && canvasItems.length > 0;

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary-500/10 rounded-2xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Welcome to WorkAgent</h2>
            <p className="text-sm text-slate-400 mt-1">Select a workspace from the sidebar to get started</p>
          </div>
        </div>
      </div>
    );
  }

  if (openSessionIds.length === 0 || !activeSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              {activeWorkspace.path}
            </h2>
            <p className="text-sm text-slate-400 mt-1">Create a new chat to start working</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex min-h-0 min-w-0">
      {/* Chat side */}
      <div
        className="flex flex-col min-h-0 min-w-0"
        style={{ width: showCanvas ? `${100 - canvasWidth}%` : '100%' }}
      >
        {openSessionIds.length > 1 && <ChatTabs />}
        <ChatPanel key={activeSessionId} sessionId={activeSessionId} />
      </div>

      {/* Drag divider */}
      {showCanvas && (
        <div
          className="w-1 cursor-col-resize bg-slate-200 dark:bg-slate-700 hover:bg-primary-400 dark:hover:bg-primary-600 active:bg-primary-500 transition-colors shrink-0 relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      {/* Canvas side */}
      {showCanvas && (
        <div className="min-h-0" style={{ width: `${canvasWidth}%` }}>
          <CanvasPanel />
        </div>
      )}
    </div>
  );
}
