import { Router } from 'express';
import { SessionService } from '../../services/SessionService.js';
import { MessageService } from '../../services/MessageService.js';

const router = Router();
const sessionService = new SessionService();
const messageService = new MessageService();

router.get('/', (req, res) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId query parameter is required' });
    }
    const sessions = sessionService.listByWorkspace(workspaceId);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const session = sessionService.getById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { workspaceId, title, workingDirectory } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    const session = sessionService.create(workspaceId, title, workingDirectory);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const session = sessionService.update(req.params.id, req.body);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    sessionService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/messages', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const messages = messageService.listBySession(req.params.id, limit, offset);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
