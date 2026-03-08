import { Router } from 'express';
import { CursorAgent } from '../../agents/CursorAgent.js';

const router = Router();

router.get('/config', (_req, res) => {
  const config = CursorAgent.loadConfig();
  if (!config || !config.apiKey) {
    return res.json({ configured: false });
  }
  res.json({
    configured: true,
    apiKeySet: true,
    apiKeyPreview: config.apiKey.slice(0, 8) + '...',
  });
});

router.put('/config', (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    CursorAgent.saveConfig({ apiKey });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/config', (_req, res) => {
  try {
    CursorAgent.saveConfig({ apiKey: '' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
