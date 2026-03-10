import { Router } from 'express';
import { MemoryService } from '../../services/MemoryService.js';
import type { MemoryCategory, MemorySource } from '../../services/MemoryService.js';

const router = Router();
const memoryService = new MemoryService();

// Specific routes MUST come before wildcard /:path(*)

router.put('/entry/:id', (req, res) => {
  try {
    const { content, category } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const entry = memoryService.update(req.params.id, content, category);
    if (!entry) return res.status(404).json({ error: 'Memory not found' });
    res.json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/entry/:id', (req, res) => {
  try {
    memoryService.delete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/context/:path(*)', (req, res) => {
  try {
    const context = memoryService.retrieveForContext(req.params.path);
    res.json({ context });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract/:path(*)', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    const extracted = await memoryService.extractMemories(req.params.path, messages);
    res.json({ extracted, count: extracted.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Wildcard routes last
router.get('/list/:path(*)', (req, res) => {
  try {
    const category = req.query.category as MemoryCategory | undefined;
    const exact = req.query.exact === 'true';
    const entries = exact
      ? memoryService.listExact(req.params.path)
      : memoryService.list(req.params.path, category);
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add/:path(*)', (req, res) => {
  try {
    const { category, content, source } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const entry = memoryService.create(
      req.params.path,
      (category as MemoryCategory) || 'semantic',
      content,
      (source as MemorySource) || 'manual'
    );
    res.json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
