import { useEffect, useState } from 'react';
import { Key, Save, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';

interface LLMConfig {
  configured: boolean;
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKeySet?: boolean;
  apiKeyPreview?: string;
}

const PROVIDERS = [
  { id: 'qwen', name: 'Qwen (DashScope)', hint: 'sk-...' },
  { id: 'openai', name: 'OpenAI', hint: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', hint: 'sk-ant-...' },
  { id: 'deepseek', name: 'DeepSeek', hint: 'sk-...' },
  { id: 'openrouter', name: 'OpenRouter', hint: 'sk-or-...' },
  { id: 'custom', name: 'Custom / Local', hint: 'any key or "none"' },
];

export function LLMSettings({ onConfigured }: { onConfigured?: () => void }) {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [provider, setProvider] = useState('qwen');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [providerDefaults, setProviderDefaults] = useState<Record<string, { baseUrl: string; model: string }>>({});

  useEffect(() => {
    loadConfig();
    loadProviders();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api.llm.getConfig();
      setConfig(data);
      if (data.configured) {
        setProvider(data.provider);
        setModel(data.model || '');
        setBaseUrl(data.baseUrl || '');
      }
    } catch {
      // not configured
    }
  };

  const loadProviders = async () => {
    try {
      const data = await api.llm.getProviders();
      setProviderDefaults(data);
    } catch {
      // ignore
    }
  };

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const defaults = providerDefaults[p];
    if (defaults) {
      setModel(defaults.model);
      setBaseUrl(defaults.baseUrl);
    }
  };

  const handleSave = async () => {
    if (!apiKey && !config?.apiKeySet) {
      setError('API key is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.llm.saveConfig({
        provider,
        apiKey: apiKey || '(unchanged)',
        model: model || undefined,
        baseUrl: baseUrl || undefined,
      });
      await api.agentControl.reselect();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadConfig();
      onConfigured?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Key className="w-4 h-4 text-primary-500" />
        LLM Configuration
      </div>

      {config?.configured && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs">
          <Check className="w-3.5 h-3.5" />
          Active: {config.provider} / {config.model}
          {config.apiKeyPreview && <span className="text-emerald-500/60 ml-auto font-mono">{config.apiKeyPreview}</span>}
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Provider</label>
        <div className="relative">
          <select
            value={provider}
            onChange={e => handleProviderChange(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 pr-8"
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          API Key {config?.apiKeySet && <span className="text-emerald-500">(set)</span>}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={config?.apiKeySet ? 'Leave blank to keep current key' : PROVIDERS.find(p => p.id === provider)?.hint}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Model</label>
        <input
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={providerDefaults[provider]?.model || 'model name'}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Base URL</label>
        <input
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder={providerDefaults[provider]?.baseUrl || 'https://api.example.com/v1'}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono outline-none focus:border-primary-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 text-sm font-medium transition-colors"
      >
        {saved ? <><Check className="w-4 h-4" /> Saved &amp; Activated</> :
         saving ? 'Saving...' :
         <><Save className="w-4 h-4" /> Save &amp; Activate</>}
      </button>
    </div>
  );
}
