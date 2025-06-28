import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
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

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  default: {
    'ws-port': parseInt(process.env.WS_PORT || '8081'),
    'port': parseInt(process.env.PORT || '3000')
  }
});

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
const wsPort = argv['ws-port'];
const wsServer = new WebSocketServer(wsPort, sessionManager, bufferManager, eventManager);

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

const httpPort = argv.port;
server.listen(httpPort, '0.0.0.0', () => {
  console.log(`HTTP server listening on 0.0.0.0:${httpPort}`);
  console.log(`WebSocket server listening on 0.0.0.0:${wsPort}`);
  console.log(`\nUsage: tsx src/server/index.ts [options]`);
  console.log(`  --port <port>     HTTP server port (default: 3000)`);
  console.log(`  --ws-port <port>  WebSocket server port (default: 8081)`);
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