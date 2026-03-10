import { Router } from 'express';
import { ConfigService } from '../../services/ConfigService.js';
import { GenerateService } from '../../services/GenerateService.js';

const router = Router();
const configService = new ConfigService();
const generateService = new GenerateService();

function p(val: string | string[]): string {
  return Array.isArray(val) ? val.join('/') : val;
}

router.post('/generate/:filename/{*path}', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });
    const content = await generateService.generate(req.params.filename, description, p(req.params.path));
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/resolve/{*path}', (req, res) => {
  try {
    const config = configService.resolveConfig(p(req.params.path));
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/file/:filename/{*path}', (req, res) => {
  try {
    const content = configService.getFile(p(req.params.path), req.params.filename);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/file/:filename/{*path}', (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content is required' });
    configService.saveFile(p(req.params.path), req.params.filename, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/skill/{*path}', (req, res) => {
  try {
    const content = configService.getSkill(p(req.params.path));
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/skill/{*path}', (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content is required' });
    configService.saveSkill(p(req.params.path), content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/soul/{*path}', (req, res) => {
  try {
    const content = configService.getSoul(p(req.params.path));
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/soul/{*path}', (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content is required' });
    configService.saveSoul(p(req.params.path), content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings/{*path}', (req, res) => {
  try {
    const settings = configService.getSettings(p(req.params.path));
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings/{*path}', (req, res) => {
  try {
    const current = configService.getSettings(p(req.params.path));
    const merged = { ...current, ...req.body };
    configService.saveSettings(p(req.params.path), merged);
    res.json({ success: true, settings: merged });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
