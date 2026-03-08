import { Router } from 'express';
import { ConfigService } from '../../services/ConfigService.js';

const router = Router();
const configService = new ConfigService();

router.get('/resolve/:path(*)', (req, res) => {
  try {
    const config = configService.resolveConfig(req.params.path);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/skill/:path(*)', (req, res) => {
  try {
    const content = configService.getSkill(req.params.path);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/skill/:path(*)', (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content is required' });
    configService.saveSkill(req.params.path, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/soul/:path(*)', (req, res) => {
  try {
    const content = configService.getSoul(req.params.path);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/soul/:path(*)', (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content is required' });
    configService.saveSoul(req.params.path, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings/:path(*)', (req, res) => {
  try {
    const settings = configService.getSettings(req.params.path);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings/:path(*)', (req, res) => {
  try {
    const current = configService.getSettings(req.params.path);
    const merged = { ...current, ...req.body };
    configService.saveSettings(req.params.path, merged);
    res.json({ success: true, settings: merged });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
