import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from './SessionManager.js';
import { BufferManager } from './BufferManager.js';
import { SessionStore } from './SessionStore.js';
import { WebSocketServer } from './WebSocketServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Initialize managers
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(bufferManager, sessionStore);

// Initialize WebSocket server
const wsPort = parseInt(process.env.WS_PORT || '8282');
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

const httpPort = parseInt(process.env.PORT || '3000');
server.listen(httpPort, () => {
  console.log(`HTTP server listening on port ${httpPort}`);
  console.log(`WebSocket server listening on port ${wsPort}`);
});