import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  SessionManager, 
  BufferManager, 
  SessionStore, 
  WebSocketServer, 
  EventManager,
  TerminalDataPipeline,
  PipelineIntegration,
  CommonProcessors,
  CommonFilters
} from '@shelltender/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const port = parseInt(process.env.PORT || '8080');
const useSinglePort = process.env.SINGLE_PORT !== 'false'; // Default to true

const app = express();
const server = createServer(app);

// Initialize core components
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const eventManager = new EventManager();

// Initialize session store before creating session manager
await sessionStore.initialize();
const sessionManager = new SessionManager(sessionStore); // Note: removed bufferManager dependency

// Initialize pipeline
const pipeline = new TerminalDataPipeline({
  enableAudit: process.env.ENABLE_AUDIT === 'true',
  enableMetrics: process.env.ENABLE_METRICS === 'true'
});

// Configure pipeline processors
pipeline.addProcessor('security', CommonProcessors.securityFilter([
  /password["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
  /api[_-]?key["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
  /token["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
  /secret["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
]), 10);

pipeline.addProcessor('credit-card', CommonProcessors.creditCardRedactor(), 15);
pipeline.addProcessor('rate-limit', CommonProcessors.rateLimiter(1024 * 1024), 20);
pipeline.addProcessor('line-endings', CommonProcessors.lineEndingNormalizer(), 30);

// Configure pipeline filters
pipeline.addFilter('no-binary', CommonFilters.noBinary());
pipeline.addFilter('max-size', CommonFilters.maxDataSize(10 * 1024)); // 10KB max per chunk

// Initialize WebSocket server
const wsServer = useSinglePort 
  ? WebSocketServer.create(
      { server, path: '/ws' }, // Attach to HTTP server on /ws path
      sessionManager, 
      bufferManager, 
      eventManager
    )
  : WebSocketServer.create(
      parseInt(process.env.WS_PORT || '8081'), // Separate port if SINGLE_PORT=false
      sessionManager, 
      bufferManager, 
      eventManager
    );

// Set up integration
const integration = new PipelineIntegration(
  pipeline,
  sessionManager,
  bufferManager,
  wsServer,
  sessionStore,
  eventManager
);
integration.setup();

// Serve static files from the client build
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API endpoints
app.get('/api/sessions', (req, res) => {
  const sessions = sessionManager.getAllSessions();
  res.json(sessions);
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port,
    mode: useSinglePort ? 'single-port' : 'dual-port',
    wsPath: useSinglePort ? '/ws' : undefined,
    wsPort: useSinglePort ? undefined : parseInt(process.env.WS_PORT || '8081')
  });
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

// Pipeline status endpoint
app.get('/api/pipeline/status', (req, res) => {
  res.json({
    processors: pipeline.getProcessorNames(),
    filters: pipeline.getFilterNames(),
    options: {
      audit: pipeline.options.enableAudit || false,
      metrics: pipeline.options.enableMetrics || false
    }
  });
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

server.listen(port, '0.0.0.0', () => {
  if (useSinglePort) {
    console.log(`✅ Server running in SINGLE PORT mode on 0.0.0.0:${port}`);
    console.log(`   HTTP API: http://localhost:${port}/api`);
    console.log(`   WebSocket: ws://localhost:${port}/ws`);
    console.log(`   Static files: http://localhost:${port}`);
  } else {
    const wsPort = parseInt(process.env.WS_PORT || '8081');
    console.log(`Server running in DUAL PORT mode`);
    console.log(`   HTTP server: http://localhost:${port}`);
    console.log(`   WebSocket server: ws://localhost:${wsPort}`);
  }
  console.log(`\nEnvironment Variables:`);
  console.log(`  PORT=${port} (HTTP/unified port)`);
  console.log(`  SINGLE_PORT=${useSinglePort} (set to 'false' for dual-port mode)`);
  if (!useSinglePort) {
    console.log(`  WS_PORT=${process.env.WS_PORT || '8081'} (WebSocket port in dual-port mode)`);
  }
  console.log(`\nPipeline Configuration:`);
  console.log(`  Processors: ${pipeline.getProcessorNames().join(', ')}`);
  console.log(`  Filters: ${pipeline.getFilterNames().join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  integration.teardown();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});