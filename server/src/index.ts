import http from 'http';
import { createHttpServer } from './gateway/httpServer.js';
import { createWebSocketServer } from './gateway/wsServer.js';
import { AgentBridge } from './agents/AgentBridge.js';
import { WorkspaceService } from './services/WorkspaceService.js';
import { ConfigService } from './services/ConfigService.js';
import { initDatabase, closeDatabase } from './db/database.js';

const PORT = parseInt(process.env.PORT || '3001');

async function main() {
  console.log('WorkAgent Gateway starting...');

  await initDatabase();
  console.log('Database initialised');

  const workspaceService = new WorkspaceService();
  workspaceService.ensureDefaultWorkspaces();

  const configService = new ConfigService();
  configService.ensureDefaultConfigs();

  const agentBridge = new AgentBridge();
  agentBridge.syncFromDatabase();
  await agentBridge.autoSelectDefault();

  const app = createHttpServer(agentBridge);
  const server = http.createServer(app);
  createWebSocketServer(server, agentBridge);

  server.listen(PORT, () => {
    console.log(`Gateway server running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`Data directory: ~/.workagent/`);
  });

  const shutdown = () => {
    console.log('\nShutting down...');
    closeDatabase();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
