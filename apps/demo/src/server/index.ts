import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import { SessionManager, BufferManager, SessionStore, WebSocketServer } from '@shelltender/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  default: {
    'ws-port': parseInt(process.env.WS_PORT || '8081'),
    'port': parseInt(process.env.PORT || '3000')
  }
});

const app = express();
const server = createServer(app);

// Initialize managers
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(bufferManager, sessionStore);

// Initialize WebSocket server
const wsPort = argv['ws-port'];
const wsServer = new WebSocketServer(wsPort, sessionManager, bufferManager);

// Serve static files from the client build
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API endpoints
app.get('/api/sessions', (req, res) => {
  const sessions = sessionManager.getAllSessions();
  res.json(sessions);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', wsPort });
});

// Delete a session
app.delete('/api/sessions/:id', (req, res) => {
  const sessionId = req.params.id;
  const success = sessionManager.killSession(sessionId);
  
  if (success) {
    res.json({ success: true, message: 'Session killed' });
  } else {
    res.status(404).json({ success: false, message: 'Session not found' });
  }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

const httpPort = argv.port;
server.listen(httpPort, '0.0.0.0', () => {
  console.log(`HTTP server listening on 0.0.0.0:${httpPort}`);
  console.log(`WebSocket server listening on 0.0.0.0:${wsPort}`);
  console.log(`\nUsage: tsx src/server/index.ts [options]`);
  console.log(`  --port <port>     HTTP server port (default: 3000)`);
  console.log(`  --ws-port <port>  WebSocket server port (default: 8081)`);
});