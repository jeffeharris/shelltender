import express from 'express';
import { createServer, Server, IncomingMessage } from 'http';
import { AddressInfo } from 'net';
import { Duplex } from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import { WebSocket } from 'ws';
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
} from './index.js';
import { createAdminRouter } from './routes/admin.js';
import { TerminalSession, SessionOptions, TerminalData } from '@shelltender/core';

// Optional cross-package resolution for the built-in /terminal page assets.
// The embeddable terminal lives in @shelltender/client; serve it if installed,
// otherwise the page degrades gracefully (server-only installs still work).
const shelltenderRequire = createRequire(import.meta.url);
function resolveOptional(spec: string): string | null {
  try {
    return shelltenderRequire.resolve(spec);
  } catch {
    return null;
  }
}

// Self-contained terminal page. Loads the embed bundle + xterm.css from this
// same server and calls Shelltender.mountTerminal() from query parameters.
// Query params: sessionId, cwd, command, args (JSON array), label, and the
// convenience `tmux=<name>` (runs `tmux new-session -A -s <name>`).
const TERMINAL_PAGE_HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Terminal</title>
<link rel="stylesheet" href="terminal/xterm.css">
<style>html,body{margin:0;height:100%;background:#0b1120}#term{position:absolute;inset:0;padding:6px;box-sizing:border-box}</style>
</head><body>
<div id="term"></div>
<script src="terminal/embed.global.js"></script>
<script>
  (function () {
    var p = new URLSearchParams(location.search);
    var opts = {};
    if (p.get('sessionId')) opts.sessionId = p.get('sessionId');
    if (p.get('cwd')) opts.cwd = p.get('cwd');
    if (p.get('command')) opts.command = p.get('command');
    if (p.get('args')) { try { opts.args = JSON.parse(p.get('args')); } catch (e) {} }
    if (p.get('tmux')) {
      opts.command = 'tmux';
      opts.args = ['new-session', '-A', '-s', p.get('tmux')];
      if (!opts.sessionId) opts.sessionId = 'tmux:' + p.get('tmux');
    }
    if (p.get('label')) document.title = p.get('label') + ' — terminal';
    if (!window.Shelltender || !window.Shelltender.mountTerminal) {
      document.getElementById('term').innerText =
        'Terminal unavailable: @shelltender/client is not installed on the server.';
      return;
    }
    window.Shelltender.mountTerminal(document.getElementById('term'), opts);
  })();
</script>
</body></html>`;

export interface ShelltenderConfig {
  port?: number | 'auto';
  wsPath?: string;
  enablePipeline?: boolean;
  enableSecurity?: boolean;
  sessionOptions?: Partial<SessionOptions>;
  server?: Server;
  sessionManager?: SessionManager;
  sessionStore?: SessionStore;
  host?: string;
  trustProxy?: boolean;
  staticDir?: string;
  apiRoutes?: boolean;
  defaultDirectory?: (sessionId: string) => string;
  transformSessionConfig?: (config: SessionOptions, sessionId: string) => Promise<SessionOptions>;
  dataDir?: string;
}

/** Configuration returned by getConfiguration() */
export interface ShelltenderConfiguration {
  port?: number | 'auto';
  wsPath?: string;
  enablePipeline?: boolean;
  enableSecurity?: boolean;
  host?: string;
  trustProxy?: boolean;
  staticDir?: string;
  apiRoutes?: boolean;
  dataDir?: string;
  bufferManager: {
    maxBufferSize: number;
  };
  pipeline: {
    processors: string[];
    filters: string[];
  } | null;
  security: {
    enableHelmet: boolean;
    enableCors: boolean;
    corsOrigin: string | boolean;
    enableRateLimiting: boolean;
    enableSessionTimeout: boolean;
    sessionTimeoutMs: number;
  };
}

export interface ShelltenderInstance {
  sessionManager: SessionManager;
  bufferManager: BufferManager;
  wsServer: WebSocketServer;
  sessionStore: SessionStore;
  eventManager: EventManager;
  pipeline?: TerminalDataPipeline;
  integration?: PipelineIntegration;
  server?: Server;
  port?: number;
  url?: string;
  wsUrl?: string;
  config: ShelltenderConfig & { isReady: boolean };

  // Convenience methods
  createSession: (options?: SessionOptions) => Promise<TerminalSession>;
  getSession: (sessionId: string) => TerminalSession | null;
  getAllSessions: () => TerminalSession[];
  resizeSession: (sessionId: string, cols: number, rows: number) => boolean;
  killSession: (sessionId: string) => boolean;
  broadcast: (message: TerminalData) => void;
  getActiveSessionCount: () => number;
  getConfiguration: () => ShelltenderConfiguration;
  stop: () => Promise<void>;
}

/**
 * Create a Shelltender instance attached to an Express app
 */
export async function createShelltender(
  app: express.Application,
  config: ShelltenderConfig = {}
): Promise<ShelltenderInstance> {
  const {
    port = process.env.SHELLTENDER_PORT || process.env.PORT || 0,
    wsPath = process.env.SHELLTENDER_WS_PATH || '/ws',
    enablePipeline = true,
    enableSecurity = process.env.NODE_ENV !== 'test',
    sessionOptions = {},
    server,
    host = '0.0.0.0',
    trustProxy = false,
    staticDir,
    apiRoutes = true,
    defaultDirectory,
    transformSessionConfig
  } = config;

  // Detect environment
  const env = await detectEnvironment({ app });
  
  // Apply environment-based defaults
  const finalConfig: ShelltenderConfig = {
    ...config,
    port: port === 'auto' ? 0 : Number(port),
    wsPath,
    enablePipeline,
    enableSecurity: enableSecurity || env.isProduction,
    host: env.isDocker || env.isKubernetes ? '0.0.0.0' : host,
    trustProxy: trustProxy || env.behindProxy
  };

  // Initialize components (reuse if provided)
  const sessionStore = config.sessionStore || new SessionStore(config.dataDir || '.sessions');
  if (!config.sessionStore) {
    await sessionStore.initialize();
  }
  
  const bufferManager = new BufferManager();
  const eventManager = new EventManager();
  const sessionManager = config.sessionManager || new SessionManager(sessionStore);
  // Wait for the store to initialize and saved sessions to restore before the
  // server starts serving, so there's no init-order race for consumers.
  await sessionManager.ready;

  // Don't create HTTP server when using Express - let user call app.listen()
  let httpServer = server;
  let wsServer: WebSocketServer;
  
  if (!server) {
    // We need to defer WebSocket setup until after app.listen() is called
    // For now, create WebSocket in noServer mode
    wsServer = WebSocketServer.create(
      { noServer: true },
      sessionManager,
      bufferManager,
      eventManager
    );
    
    // Monkey-patch app.listen to set up WebSocket when server starts
    const originalListen = app.listen.bind(app);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app.listen as any) = function(...args: Parameters<typeof originalListen>) {
      const server = originalListen(...args);

      // Now set up WebSocket upgrade handling
      server.on('upgrade', function upgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
        socket.on('error', (err: Error) => {
          console.error('Socket error:', err);
        });

        const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

        if (pathname === wsPath) {
          wsServer.server.handleUpgrade(request, socket, head, function done(ws: WebSocket) {
            wsServer.server.emit('connection', ws, request);
          });
        } else {
          socket.destroy();
        }
      });

      httpServer = server;
      return server;
    };
  } else {
    // Server provided, use it directly
    wsServer = WebSocketServer.create(
      { server: httpServer, path: wsPath },
      sessionManager,
      bufferManager,
      eventManager
    );
  }
  
  let pipeline: TerminalDataPipeline | undefined;
  let integration: PipelineIntegration | undefined;
  
  if (enablePipeline) {
    // Initialize pipeline with security by default
    pipeline = new TerminalDataPipeline({
      enableAudit: process.env.SHELLTENDER_ENABLE_AUDIT === 'true',
      enableMetrics: process.env.SHELLTENDER_ENABLE_METRICS === 'true'
    });
    
    // Add default processors
    if (enableSecurity) {
      pipeline.addProcessor('security', CommonProcessors.securityFilter([
        /password[\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
        /api[_-]?key[\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
        /token[\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
        /secret[\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
      ]), 10);
      
      pipeline.addProcessor('credit-card', CommonProcessors.creditCardRedactor(), 15);
    }
    
    pipeline.addProcessor('rate-limit', CommonProcessors.rateLimiter(1024 * 1024), 20);
    pipeline.addFilter('no-binary', CommonFilters.noBinary());
    
    // Set up integration - THIS IS CRITICAL!
    integration = new PipelineIntegration(
      pipeline,
      sessionManager,
      bufferManager,
      wsServer,
      sessionStore,
      eventManager
    );
    integration.setup();
  }
  
  // Set up API routes if enabled
  if (apiRoutes) {
    setupApiRoutes(app, sessionManager, bufferManager, wsServer, pipeline, finalConfig);
  }
  
  // Serve static files if configured
  if (staticDir) {
    app.use(express.static(staticDir));
  }
  
  // Override session creation to support default directory, transform, or session options
  const hasSessionOptions = sessionOptions && Object.keys(sessionOptions).length > 0;
  if (defaultDirectory || transformSessionConfig || hasSessionOptions) {
    const originalCreate = sessionManager.createSession.bind(sessionManager);
    // Override createSession with custom logic
    const customCreateSession = async (options?: SessionOptions): Promise<TerminalSession> => {
      let finalOptions: SessionOptions = { ...sessionOptions, ...options };

      // Apply default directory if not specified
      if (defaultDirectory && !finalOptions.cwd) {
        finalOptions.cwd = defaultDirectory(finalOptions.id || '');
      }

      // Transform config if handler provided - properly await async transform
      if (transformSessionConfig) {
        try {
          finalOptions = await transformSessionConfig(finalOptions, finalOptions.id || '');
        } catch (error) {
          console.error('Error in transformSessionConfig:', error);
          // Continue with non-transformed options
        }
      }

      return originalCreate(finalOptions);
    };
    // Replace the method on the session manager
    Object.defineProperty(sessionManager, 'createSession', {
      value: customCreateSession,
      writable: true,
      configurable: true
    });
  }
  
  // Create convenience instance
  const instance: ShelltenderInstance = {
    sessionManager,
    bufferManager,
    wsServer,
    sessionStore,
    eventManager,
    pipeline,
    integration,
    server: httpServer,
    port: finalConfig.port === 'auto' ? 0 : (finalConfig.port as number),
    config: { ...finalConfig, isReady: true },
    
    // Convenience methods
    createSession: async (options) => sessionManager.createSession({ ...sessionOptions, ...options }),
    getSession: (sessionId) => sessionManager.getSession(sessionId),
    getAllSessions: () => sessionManager.getAllSessions(),
    resizeSession: (sessionId, cols, rows) => sessionManager.resizeSession(sessionId, cols, rows),
    killSession: (sessionId) => sessionManager.killSession(sessionId),
    broadcast: (message) => {
      // Broadcast to all connected clients
      wsServer.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    },
    getActiveSessionCount: () => sessionManager.getAllSessions().length,
    getConfiguration: () => ({
      ...finalConfig,
      bufferManager: {
        maxBufferSize: bufferManager.maxSize
      },
      pipeline: pipeline ? {
        processors: pipeline.getProcessorNames(),
        filters: pipeline.getFilterNames()
      } : null,
      security: {
        enableHelmet: false, // Would be set based on middleware
        enableCors: true,
        corsOrigin: env.isDevelopment ? '*' : false,
        enableRateLimiting: enableSecurity,
        enableSessionTimeout: enableSecurity,
        sessionTimeoutMs: enableSecurity ? 3600000 : 0
      }
    }),
    stop: async () => {
      if (integration) {
        integration.teardown();
      }
      if (wsServer) {
        wsServer.server.close();
      }
      if (httpServer && httpServer.listening) {
        await new Promise<void>((resolve) => {
          httpServer!.close(() => resolve());
        });
      }
    }
  };
  
  // Don't auto-start the server - let the user control this
  // Set initial values
  instance.port = typeof finalConfig.port === 'number' ? finalConfig.port : 0;
  instance.url = instance.port ? `http://localhost:${instance.port}` : undefined;
  instance.wsUrl = instance.port ? `ws://localhost:${instance.port}${wsPath}` : undefined;
  
  return instance;
}

/**
 * Create a standalone Shelltender server
 */
export async function createShelltenderServer(config: ShelltenderConfig = {}) {
  const app = express();
  const shelltender = await createShelltender(app, config);
  
  // With our v0.6.1 changes, we need to call app.listen() to create the server
  const server = await new Promise<Server>((resolve) => {
    const srv = app.listen((config.port as number) || 0, config.host || '0.0.0.0', () => {
      const addr = srv.address() as AddressInfo;
      shelltender.port = addr.port;
      shelltender.url = `http://localhost:${addr.port}`;
      shelltender.wsUrl = `ws://localhost:${addr.port}${shelltender.config.wsPath}`;
      // Update shelltender.server reference
      shelltender.server = srv;
      resolve(srv);
    });
  });
  
  return {
    server,
    shelltender,
    port: shelltender.port!,
    url: shelltender.url!,
    wsUrl: shelltender.wsUrl!,
    stop: () => shelltender.stop()
  };
}

/**
 * One-line server startup
 */
export async function startShelltender(port?: number) {
  const result = await createShelltenderServer({ port: port || 0 });
  
  console.log(`
🚀 Shelltender is ready!
   URL: ${result.url}
   WebSocket: ${result.wsUrl}
   
   React component: <Terminal />
   
   Need help? Run: curl ${result.url}/api/shelltender/doctor
`);
  
  return result;
}

/**
 * Detect runtime environment
 */
export async function detectEnvironment(options: { app?: express.Application } = {}) {
  const env = {
    isDocker: !!process.env.DOCKER_CONTAINER,
    isKubernetes: !!process.env.KUBERNETES_SERVICE_HOST,
    isCI: !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI || process.env.JENKINS_URL),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    behindProxy: options.app?.get('trust proxy') === true,
    host: '127.0.0.1',
    enableDevTools: process.env.NODE_ENV !== 'production',
    suggestions: [] as string[]
  };
  
  if (env.isDocker || env.isKubernetes) {
    env.host = '0.0.0.0';
    env.suggestions.push(env.isDocker ? 'Using 0.0.0.0 for Docker compatibility' : 'Detected Kubernetes environment');
  }
  
  if (env.isCI) {
    env.suggestions.push('Running in CI environment - using minimal configuration');
  }
  
  if (env.behindProxy) {
    env.suggestions.push('Detected proxy setup - WebSocket URLs will use X-Forwarded headers');
  }
  
  return env;
}

/** Input config for validation - can include unknown/legacy fields */
export type ValidationInput = Record<string, unknown>;

/** Validation result returned by validateConfiguration() */
export interface ValidationResult {
  errors: string[];
  warnings: string[];
  fixes: Record<string, unknown>;
  migration?: {
    from: { websocketPort?: number; httpPort?: number };
    to: { port: number; wsPath: string };
  };
}

/**
 * Validate configuration
 */
export async function validateConfiguration(config: ValidationInput): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes: Record<string, unknown> = {};

  // Check wsPath
  if (typeof config.wsPath === 'string' && !config.wsPath.startsWith('/')) {
    errors.push('wsPath must start with /');
    fixes.wsPath = `/${config.wsPath}`;
  }

  // Check port
  if (config.port && typeof config.port === 'string' && config.port !== 'auto') {
    errors.push('port must be a number or "auto"');
    fixes.port = parseInt(config.port);
  }

  // Check boolean flags
  const booleanFields = ['enablePipeline', 'enableSecurity', 'enableAudit', 'enableMetrics'];
  for (const field of booleanFields) {
    if (field in config && typeof config[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
      fixes[field] = config[field] === 'true' || config[field] === 'yes' || config[field] === '1';
    }
  }

  // Check maxSessions
  if (typeof config.maxSessions === 'number' && config.maxSessions < 0) {
    errors.push('maxSessions must be positive');
    fixes.maxSessions = 10;
  }

  // Check for legacy config
  if ('websocketPort' in config || 'httpPort' in config) {
    warnings.push('Using legacy dual-port configuration');
    const httpPort = typeof config.httpPort === 'number' ? config.httpPort : 3000;
    const websocketPort = typeof config.websocketPort === 'number' ? config.websocketPort : undefined;
    return {
      errors,
      warnings,
      fixes,
      migration: {
        from: { websocketPort, httpPort },
        to: { port: httpPort, wsPath: '/ws' }
      }
    };
  }

  return { errors, warnings, fixes };
}

/**
 * Set up API routes
 */
function setupApiRoutes(
  app: express.Application,
  sessionManager: SessionManager,
  bufferManager: BufferManager,
  wsServer: WebSocketServer,
  pipeline: TerminalDataPipeline | undefined,
  config: ShelltenderConfig
) {
  // Enable JSON body parsing for admin routes
  app.use(express.json());
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      mode: 'single-port',
      port: config.port,
      wsPath: config.wsPath,
      features: {
        pipeline: !!pipeline,
        security: config.enableSecurity,
        persistence: true
      }
    });
  });
  
  // Session management
  app.get('/api/sessions', (req, res) => {
    const sessions = sessionManager.getAllSessions().map(s => ({
      id: s.id,
      status: 'active',
      createdAt: s.createdAt
    }));
    res.json(sessions);
  });

  // Create a session over REST (mirrors the WebSocket `create` message), so
  // non-JS / server-to-server consumers can pre-create a session with a known
  // id/cwd/command and then connect a terminal to it by id over the WebSocket.
  // Accepts SessionOptions; `sessionId` is honored as an alias for `id`. The
  // response shape ({id, sessionId, status}) matches the pattern consumers
  // (e.g. PocketDev) were hand-rolling before this route existed.
  app.post('/api/sessions', (req, res) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? { ...req.body } : {};
      if (body.sessionId && !body.id) body.id = body.sessionId;
      delete body.sessionId;
      const session = sessionManager.createSession(body);
      res.json({
        id: session.id,
        sessionId: session.id,
        status: 'active',
        createdAt: session.createdAt
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'failed to create session' });
    }
  });

  // Built-in embeddable terminal page (drop-in via <iframe src="/terminal?...">).
  // Serves the @shelltender/client embed bundle + xterm.css from this server, so
  // the browser only talks to one origin. Degrades gracefully if the client
  // package isn't installed (server-only deployments).
  app.get('/terminal', (_req, res) => {
    res.type('html').send(TERMINAL_PAGE_HTML);
  });
  app.get('/terminal/embed.global.js', (_req, res) => {
    const file = resolveOptional('@shelltender/client/embed.global.js');
    if (!file) {
      return res.status(503).type('application/javascript')
        .send('console.error("Shelltender /terminal page requires @shelltender/client to be installed.");');
    }
    res.type('application/javascript').sendFile(file);
  });
  app.get('/terminal/xterm.css', (_req, res) => {
    const pkg = resolveOptional('@xterm/xterm/package.json');
    if (!pkg) {
      return res.status(503).type('text/css').send('/* @xterm/xterm not found */');
    }
    res.type('text/css').sendFile(path.join(path.dirname(pkg), 'css', 'xterm.css'));
  });

  // Shelltender status
  app.get('/api/shelltender/status', (req, res) => {
    res.json({
      version: '0.5.0',
      sessions: sessionManager.getAllSessions().length,
      pipeline: pipeline ? {
        processors: pipeline.getProcessorNames(),
        filters: pipeline.getFilterNames()
      } : null,
      config: {
        wsPath: config.wsPath,
        enablePipeline: config.enablePipeline,
        enableSecurity: config.enableSecurity
      }
    });
  });
  
  // Doctor endpoint
  app.get('/api/shelltender/doctor', async (req, res) => {
    const checks = {
      server: { status: 'ok', message: 'Server is running' },
      websocket: { status: 'ok', message: 'WebSocket server is ready' },
      pipeline: pipeline ? { status: 'ok', message: 'Pipeline is connected' } : { status: 'warning', message: 'Pipeline not enabled' },
      sessionManager: { status: 'ok', message: 'Session manager is active' },
      bufferManager: { status: 'ok', message: 'Buffer manager is active' },
      sessions: {
        status: 'ok',
        count: sessionManager.getAllSessions().length,
        message: `${sessionManager.getAllSessions().length} active sessions`
      },
      memory: {
        status: 'ok',
        usage: process.memoryUsage(),
        message: 'Memory usage is normal'
      },
      disk: {
        status: 'ok',
        message: 'Session persistence is enabled'
      }
    };
    
    const suggestions: string[] = [];
    const quickFixes: string[] = [];
    
    if (!pipeline) {
      suggestions.push('Enable pipeline for production use');
      quickFixes.push('Set enablePipeline: true in configuration');
    }
    
    if (!config.enableSecurity && process.env.NODE_ENV === 'production') {
      suggestions.push('Enable security filters for production');
      quickFixes.push('Set enableSecurity: true in configuration');
    }
    
    const status = Object.values(checks).some(c => c.status === 'error') ? 'error' :
                   Object.values(checks).some(c => c.status === 'warning') ? 'warning' : 'healthy';
    
    res.json({
      status,
      timestamp: new Date().toISOString(),
      checks,
      config: {
        wsPath: config.wsPath,
        port: config.port,
        enablePipeline: config.enablePipeline,
        enableSecurity: config.enableSecurity
      },
      suggestions,
      quickFixes
    });
  });
  
  // Config endpoint (dev only)
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/shelltender/config', (req, res) => {
      res.json({
        ...config,
        sessionTimeout: parseInt(process.env.SHELLTENDER_SESSION_TIMEOUT || '0'),
        enableAudit: process.env.SHELLTENDER_ENABLE_AUDIT === 'true',
        dockerOptimized: !!process.env.DOCKER_CONTAINER
      });
    });
  }
  
  // Mount admin routes
  const adminRouter = createAdminRouter(sessionManager, wsServer, bufferManager);
  app.use('/api/admin', adminRouter);
  
  // Serve admin UI
  app.get('/admin', (req, res) => {
    // For ES modules, we need to use import.meta.url instead of __dirname
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Try multiple possible locations for the admin HTML file
    const possiblePaths = [
      path.join(__dirname, 'admin', 'index.html'), // Built distribution
      path.join(__dirname, '..', 'src', 'admin', 'index.html'), // Development
      path.join(process.cwd(), 'packages', 'server', 'dist', 'admin', 'index.html'), // Monorepo dist
      path.join(process.cwd(), 'packages', 'server', 'src', 'admin', 'index.html'), // Monorepo src
    ];
    
    for (const adminPath of possiblePaths) {
      if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
      }
    }
    
    res.status(404).send('Admin UI not found. Please ensure the admin files are built and deployed.');
  });

  // Serve admin monitor UI (WebSocket-based session monitor)
  app.get('/admin/monitor', (req, res) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const possiblePaths = [
      path.join(__dirname, 'admin', 'session-monitor.html'),
      path.join(__dirname, '..', 'src', 'admin', 'session-monitor.html'),
      path.join(process.cwd(), 'packages', 'server', 'dist', 'admin', 'session-monitor.html'),
      path.join(process.cwd(), 'packages', 'server', 'src', 'admin', 'session-monitor.html'),
    ];
    
    for (const monitorPath of possiblePaths) {
      if (fs.existsSync(monitorPath)) {
        return res.sendFile(monitorPath);
      }
    }
    
    res.status(404).send('Admin Monitor UI not found.');
  });
}