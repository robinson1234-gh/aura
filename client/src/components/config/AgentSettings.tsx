import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Star, Terminal, Bot, Cpu, Save, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface AgentInfo {
  name: string;
  description: string;
  isDefault: boolean;
}

interface HealthData {
  defaultAgent: string;
  agents: Record<string, boolean>;
}

interface CursorConfig {
  configured: boolean;
  apiKeySet?: boolean;
  apiKeyPreview?: string;
}

const AGENT_ICONS: Record<string, typeof Bot> = {
  llm: Cpu,
  cursor: Terminal,
  echo: Bot,
};

const AGENT_COLORS: Record<string, string> = {
  llm: 'text-violet-500',
  cursor: 'text-blue-500',
  echo: 'text-slate-400',
};

export function AgentSettings() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  // Cursor config state
  const [cursorConfig, setCursorConfig] = useState<CursorConfig | null>(null);
  const [cursorApiKey, setCursorApiKey] = useState('');
  const [cursorSaving, setCursorSaving] = useState(false);
  const [cursorSaved, setCursorSaved] = useState(false);
  const [cursorError, setCursorError] = useState('');
  const [showCursorSetup, setShowCursorSetup] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [agentList, healthData, cursorCfg] = await Promise.all([
        api.agents(),
        api.health(),
        api.cursor.getConfig().catch(() => ({ configured: false }) as CursorConfig),
      ]);
      setAgents(agentList);
      setHealth(healthData);
      setCursorConfig(cursorCfg);
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleSetDefault = async (name: string) => {
    setSwitching(name);
    try {
      await api.agentControl.setDefault(name);
      await loadAll();
    } catch (e: any) {
      alert('Failed to set default agent: ' + e.message);
    } finally {
      setSwitching(null);
    }
  };

  const handleReselect = async () => {
    setRefreshing(true);
    try {
      await api.agentControl.reselect();
      await loadAll();
    } catch (e: any) {
      alert('Auto-select failed: ' + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCursorSave = async () => {
    if (!cursorApiKey) {
      setCursorError('API key is required');
      return;
    }
    setCursorSaving(true);
    setCursorError('');
    try {
      await api.cursor.saveConfig({ apiKey: cursorApiKey });
      await api.agentControl.reselect();
      setCursorSaved(true);
      setCursorApiKey('');
      setTimeout(() => setCursorSaved(false), 3000);
      await loadAll();
    } catch (e: any) {
      setCursorError(e.message);
    } finally {
      setCursorSaving(false);
    }
  };

  const renderCursorSection = (isHealthy: boolean) => {
    return (
      <div className="border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setShowCursorSetup(!showCursorSetup)}
          className="w-full text-left px-3 py-2 text-xs text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          {showCursorSetup ? 'Hide configuration' : (isHealthy ? 'Update API key' : 'Configure Cursor Agent')}
        </button>

        {showCursorSetup && (
          <div className="px-3 pb-3 space-y-3">
            {cursorConfig?.apiKeySet && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs">
                <Check className="w-3.5 h-3.5" />
                Key set: <span className="font-mono">{cursorConfig.apiKeyPreview}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cursor API Key</label>
              <input
                type="password"
                value={cursorApiKey}
                onChange={e => setCursorApiKey(e.target.value)}
                placeholder={cursorConfig?.apiKeySet ? 'Enter new key to replace' : 'key_...'}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono outline-none focus:border-primary-500"
              />
            </div>

            {cursorError && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                {cursorError}
              </div>
            )}

            <button
              onClick={handleCursorSave}
              disabled={cursorSaving || !cursorApiKey}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 text-xs font-medium transition-colors"
            >
              {cursorSaved ? <><Check className="w-3.5 h-3.5" /> Saved</> :
               cursorSaving ? 'Saving...' :
               <><Save className="w-3.5 h-3.5" /> Save Key</>}
            </button>

            <div className="text-[10px] text-slate-400 leading-relaxed space-y-1.5 pt-1">
              <p className="font-medium text-slate-500">How to get your API key:</p>
              <p>1. Go to <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">cursor.com/settings</span> in your browser</p>
              <p>2. Find the "API Keys" section</p>
              <p>3. Generate a new key and paste it above</p>
              <p className="pt-1 font-medium text-slate-500">Alternative: use CLI login</p>
              <p>Run <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">agent login</code> in a terminal to authenticate via browser. This method does not require an API key.</p>
              <p className="pt-1 font-medium text-slate-500">CLI must be installed</p>
              <p>If the agent CLI is not installed, open Cursor IDE, press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Ctrl+Shift+P</kbd>, search for <span className="font-mono">"Install 'agent' command"</span>, and run it.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Bot className="w-4 h-4 text-primary-500" />
          Agent Configuration
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh health status"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {health && (
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
          Active agent: <span className="font-semibold text-slate-700 dark:text-slate-300">{health.defaultAgent}</span>
        </div>
      )}

      <div className="space-y-2">
        {agents.map(agent => {
          const Icon = AGENT_ICONS[agent.name] || Bot;
          const color = AGENT_COLORS[agent.name] || 'text-slate-400';
          const isHealthy = health?.agents[agent.name] ?? false;
          const isDefault = health?.defaultAgent === agent.name;

          return (
            <div key={agent.name} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <Icon className={`w-5 h-5 shrink-0 ${color}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {agent.name}
                    </span>
                    {isDefault && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-1.5 py-0.5">
                        <Star className="w-2.5 h-2.5" /> DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{agent.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isHealthy ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                      <XCircle className="w-3.5 h-3.5" /> Unavailable
                    </span>
                  )}

                  {!isDefault && isHealthy && (
                    <button
                      onClick={() => handleSetDefault(agent.name)}
                      disabled={switching === agent.name}
                      className="text-xs px-2 py-1 rounded bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50"
                    >
                      {switching === agent.name ? '...' : 'Use'}
                    </button>
                  )}
                </div>
              </div>

              {agent.name === 'cursor' && renderCursorSection(isHealthy)}

              {!isHealthy && agent.name === 'llm' && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2">
                  <p className="text-xs text-slate-500">
                    Configure your API key in the <span className="font-semibold">LLM</span> tab.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleReselect}
        disabled={refreshing}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 font-medium transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        Auto-select Best Agent
      </button>

      <p className="text-[10px] text-slate-400 text-center">
        Priority: LLM (if configured) &gt; Cursor CLI (if installed &amp; authenticated) &gt; Echo (fallback)
      </p>
    </div>
  );
}
