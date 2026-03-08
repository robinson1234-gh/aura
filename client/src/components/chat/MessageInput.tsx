import { useState, useRef, useCallback } from 'react';
import { Send, Square, Paperclip, X, FileText, Image } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { api } from '../../services/api';

interface AttachedFile {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  uploading?: boolean;
  error?: string;
}

interface Props {
  sessionId: string;
}

export function MessageInput({ sessionId }: Props) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, cancelExecution } = useSessionStore();
  const cs = useSessionStore(s => s.chatStates.get(sessionId));
  const agentStatus = cs?.agentStatus || 'idle';

  const isProcessing = agentStatus === 'thinking' || agentStatus === 'executing';

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const tempId = `uploading-${Date.now()}-${file.name}`;
      setAttachments(prev => [...prev, { id: tempId, filename: file.name, mimetype: file.type, size: file.size, uploading: true }]);

      try {
        const result = await api.files.upload(file, sessionId);
        setAttachments(prev =>
          prev.map(a => a.id === tempId ? { ...result, uploading: false } : a)
        );
      } catch (err: any) {
        setAttachments(prev =>
          prev.map(a => a.id === tempId ? { ...a, uploading: false, error: err.message } : a)
        );
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [sessionId]);

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = useCallback(() => {
    const hasContent = content.trim().length > 0;
    const hasFiles = attachments.filter(a => !a.uploading && !a.error).length > 0;
    if ((!hasContent && !hasFiles) || isProcessing) return;

    let messageText = content.trim();
    const validFiles = attachments.filter(a => !a.uploading && !a.error);
    if (validFiles.length > 0) {
      const fileList = validFiles.map(f => `[Attached: ${f.filename} (${formatSize(f.size)})]`).join('\n');
      messageText = messageText ? `${messageText}\n\n${fileList}` : fileList;
    }

    sendMessage(messageText, sessionId);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, attachments, isProcessing, sessionId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 p-4">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-w-4xl mx-auto">
          {attachments.map(file => (
            <div
              key={file.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                file.error
                  ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : file.uploading
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {file.mimetype.startsWith('image/') ? (
                <Image className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="max-w-[150px] truncate">{file.filename}</span>
              <span className="text-slate-400">{formatSize(file.size)}</span>
              {file.uploading && <span className="animate-pulse">...</span>}
              {file.error && <span title={file.error}>!</span>}
              <button
                onClick={() => removeAttachment(file.id)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          title="Attach file"
          disabled={isProcessing}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
            className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors scrollbar-thin"
            rows={1}
            disabled={isProcessing}
          />
        </div>

        {isProcessing ? (
          <button
            onClick={() => cancelExecution(sessionId)}
            className="p-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors shrink-0"
            title="Cancel"
          >
            <Square className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!content.trim() && attachments.filter(a => !a.uploading && !a.error).length === 0}
            className="p-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 transition-colors shrink-0"
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
