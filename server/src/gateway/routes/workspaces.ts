import { Router } from 'express';
import { WorkspaceService } from '../../services/WorkspaceService.js';

const router = Router();
const workspaceService = new WorkspaceService();

router.get('/', (_req, res) => {
  try {
    const tree = workspaceService.getTree();
    res.json(tree);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const workspace = workspaceService.getById(req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, parentId, level } = req.body;
    if (!name || !level) {
      return res.status(400).json({ error: 'name and level are required' });
    }
    const workspace = workspaceService.create(name, parentId || null, level);
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const workspace = workspaceService.update(req.params.id, name);
    res.json(workspace);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    workspaceService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
