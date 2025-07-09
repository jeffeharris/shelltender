import express from 'express';
import { createServer } from 'http';
import { 
  SessionManager, 
  BufferManager, 
  WebSocketServer,
  SessionStore 
} from '@shelltender/server';

async function createUnifiedServer() {
  console.log('Creating unified server with HTTP and WebSocket on same port...\n');

  // Create Express app
  const app = express();
  app.use(express.json());

  // Create HTTP server
  const server = createServer(app);

  // Initialize components
  const bufferManager = new BufferManager();
  const sessionStore = new SessionStore('./unified-sessions');
  await sessionStore.initialize();
  const sessionManager = new SessionManager(sessionStore);

  // Create WebSocket server attached to HTTP server
  const wsServer = WebSocketServer.create(
    { server, path: '/ws' },
    sessionManager,
    bufferManager
  );

  // HTTP API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      mode: 'unified',
      sessions: sessionManager.getAllSessions().length 
    });
  });

  app.get('/api/sessions', (req, res) => {
    res.json(sessionManager.getAllSessions());
  });

  app.delete('/api/sessions/:id', (req, res) => {
    const success = sessionManager.killSession(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  });

  // Start the unified server
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`✅ Unified server running on port ${port}`);
    console.log(`   HTTP API: http://localhost:${port}/api`);
    console.log(`   WebSocket: ws://localhost:${port}/ws`);
    console.log('\nBoth HTTP and WebSocket are available on the same port!');
  });
}

// Run the example
createUnifiedServer().catch(console.error);