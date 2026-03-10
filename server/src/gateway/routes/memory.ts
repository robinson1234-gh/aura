import { Router } from 'express';
import { MemoryService } from '../../services/MemoryService.js';
import type { MemoryCategory, MemorySource } from '../../services/MemoryService.js';

const router = Router();
const memoryService = new MemoryService();

function p(val: string | string[]): string {
  return Array.isArray(val) ? val.join('/') : val;
}

// Specific routes MUST come before wildcard /{*path}

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

// List memories for a session (session-scoped route without workspace path)
router.get('/session/:sessionId', (req, res) => {
  try {
    const entries = memoryService.listBySession(req.params.sessionId);
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/context/{*path}', (req, res) => {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const context = memoryService.retrieveForContext(p(req.params.path), sessionId);
    res.json({ context });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract/{*path}', async (req, res) => {
  try {
    const { messages, sessionId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    const extracted = await memoryService.extractMemories(p(req.params.path), messages, sessionId);
    res.json({ extracted, count: extracted.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Wildcard routes last
router.get('/list/{*path}', (req, res) => {
  try {
    const category = req.query.category as MemoryCategory | undefined;
    const exact = req.query.exact === 'true';
    const sessionId = req.query.sessionId as string | undefined;
    const wsPath = p(req.params.path);

    if (sessionId) {
      const entries = memoryService.list(wsPath, category, sessionId);
      return res.json(entries);
    }

    const entries = exact
      ? memoryService.listExact(wsPath)
      : memoryService.list(wsPath, category);
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add/{*path}', (req, res) => {
  try {
    const { category, content, source, sessionId } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const entry = memoryService.create(
      p(req.params.path),
      (category as MemoryCategory) || 'semantic',
      content,
      (source as MemorySource) || 'manual',
      sessionId
    );
    res.json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
