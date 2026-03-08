import { Router } from 'express';
import { LLMAgent } from '../../agents/LLMAgent.js';

const router = Router();

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  qwen:       { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-coder-plus-latest' },
  openai:     { baseUrl: 'https://api.openai.com/v1',           model: 'gpt-4o' },
  anthropic:  { baseUrl: 'https://api.anthropic.com/v1',        model: 'claude-sonnet-4-20250514' },
  deepseek:   { baseUrl: 'https://api.deepseek.com/v1',        model: 'deepseek-chat' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1',       model: 'anthropic/claude-sonnet-4-20250514' },
  custom:     { baseUrl: 'http://localhost:11434/v1',           model: 'llama3' },
};

router.get('/config', (_req, res) => {
  const config = LLMAgent.loadConfig();
  if (!config) {
    return res.json({ configured: false, providers: Object.keys(PROVIDER_DEFAULTS) });
  }
  res.json({
    configured: true,
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    apiKeySet: config.apiKey.length > 0,
    apiKeyPreview: config.apiKey.slice(0, 8) + '...',
  });
});

router.put('/config', (req, res) => {
  try {
    const { provider, apiKey, model, baseUrl, maxTokens, temperature } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'provider and apiKey are required' });
    }

    const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.custom;

    let finalApiKey = apiKey;
    if (apiKey === '(unchanged)') {
      const existing = LLMAgent.loadConfig();
      if (existing?.apiKey) {
        finalApiKey = existing.apiKey;
      } else {
        return res.status(400).json({ error: 'No existing API key found. Please provide a real key.' });
      }
    }

    const config = {
      provider,
      apiKey: finalApiKey,
      model: model || defaults.model,
      baseUrl: baseUrl || defaults.baseUrl,
      maxTokens: maxTokens || 4096,
      temperature: temperature ?? 0.7,
    };

    LLMAgent.saveConfig(config);
    res.json({ success: true, provider: config.provider, model: config.model });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/providers', (_req, res) => {
  res.json(PROVIDER_DEFAULTS);
});

export default router;
