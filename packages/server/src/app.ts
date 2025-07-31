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
const sessionManager = new SessionManager(sessionStore);

// Initialize WebSocket server
const wsPort = parseInt(process.env.WS_PORT || '8282');
const wsServer = WebSocketServer.create(wsPort, sessionManager, bufferManager);

// Connect session output to WebSocket broadcasting
sessionManager.on('data', (sessionId: string, data: string) => {
  // Add to buffer and get sequence number
  const sequence = bufferManager.addToBuffer(sessionId, data);
  
  // Broadcast to connected clients
  wsServer.broadcastToSession(sessionId, {
    type: 'output',
    sessionId,
    data,
    sequence
  });
});

// Handle session end events
sessionManager.on('sessionEnd', (sessionId: string) => {
  wsServer.broadcastToSession(sessionId, {
    type: 'exit',
    sessionId,
    exitCode: 0
  });
});

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

// Serve admin monitor UI
app.get('/admin/monitor', (req, res) => {
  const monitorPath = path.join(__dirname, 'admin', 'session-monitor.html');
  res.sendFile(monitorPath);
});

// Serve test terminal
app.get('/test', (req, res) => {
  const testPath = path.join(__dirname, 'admin', 'test-terminal.html');
  res.sendFile(testPath);
});

// Serve WebSocket debug tool
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'debug-websocket.html'));
});

// Default route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Shelltender</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Shelltender Server</h1>
        <p>Available endpoints:</p>
        <ul>
          <li><a href="/test">Test Terminal</a> - Create and interact with terminal sessions</li>
          <li><a href="/admin/monitor">Admin Monitor</a> - Monitor all active sessions</li>
          <li><a href="/api/health">API Health</a> - Check server status</li>
        </ul>
      </body>
    </html>
  `);
});

const httpPort = parseInt(process.env.PORT || '3000');
server.listen(httpPort, () => {
  console.log(`HTTP server listening on port ${httpPort}`);
  console.log(`WebSocket server listening on port ${wsPort}`);
});