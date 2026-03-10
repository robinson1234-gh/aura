import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import workspaceRoutes from './routes/workspaces.js';
import sessionRoutes from './routes/sessions.js';
import configRoutes from './routes/config.js';
import fileRoutes from './routes/files.js';
import llmRoutes from './routes/llm.js';
import cursorRoutes from './routes/cursor.js';
import memoryRoutes from './routes/memory.js';
import adminRoutes from './routes/admin.js';
import type { AgentBridge } from '../agents/AgentBridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUMMARY_DIR = path.join(os.homedir(), '.workagent', 'summaries');

export function createHttpServer(agentBridge: AgentBridge) {
  const app = express();

  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/llm', llmRoutes);
  app.use('/api/cursor', cursorRoutes);
  app.use('/api/memory', memoryRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/api/health', async (_req, res) => {
    const agents = await agentBridge.healthCheckAll();
    res.json({ status: 'ok', defaultAgent: agentBridge.getDefaultName(), agents });
  });

  app.get('/api/agents', (_req, res) => {
    res.json(agentBridge.listPlugins());
  });

  app.put('/api/agents/default/:name', async (req, res) => {
    try {
      agentBridge.setDefault(req.params.name);
      res.json({ success: true, defaultAgent: req.params.name });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/agents/records', (_req, res) => {
    try {
      res.json(agentBridge.getAllAgentRecords());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/agents/records', (req, res) => {
    try {
      const record = agentBridge.createAgentRecord(req.body);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/agents/records/:id', (req, res) => {
    try {
      const record = agentBridge.updateAgentRecord(req.params.id, req.body);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/agents/records/:id', (req, res) => {
    try {
      agentBridge.deleteAgentRecord(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/agents/:name/enabled', (req, res) => {
    try {
      const { enabled } = req.body;
      agentBridge.setEnabled(req.params.name, !!enabled);
      res.json({ success: true, name: req.params.name, enabled: !!enabled });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/summaries/:id', (req, res) => {
    const filePath = path.join(SUMMARY_DIR, `${req.params.id}.md`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Summary not found' });
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ id: req.params.id, content });
  });

  app.post('/api/agents/reselect', async (_req, res) => {
    await agentBridge.autoSelectDefault();
    res.json({ defaultAgent: agentBridge.getDefaultName() });
  });

  const clientDist = path.join(__dirname, '..', '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
