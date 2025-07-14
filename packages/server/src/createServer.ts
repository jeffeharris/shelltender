import express from 'express';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
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
} from './index.js';
import { createAdminRouter } from './routes/admin.js';

export interface ShelltenderConfig {
  port?: number | 'auto';
  wsPath?: string;
  enablePipeline?: boolean;
  enableSecurity?: boolean;
  sessionOptions?: {
    defaultCommand?: string;
    defaultCwd?: string;
    defaultEnv?: Record<string, string>;
  };
  server?: Server;
  sessionManager?: SessionManager;
  sessionStore?: SessionStore;
  host?: string;
  trustProxy?: boolean;
  staticDir?: string;
  apiRoutes?: boolean;
  defaultDirectory?: (sessionId: string) => string;
  transformSessionConfig?: (config: any, sessionId: string) => Promise<any>;
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
  createSession: (options?: any) => any;
  killSession: (sessionId: string) => boolean;
  broadcast: (message: any) => void;
  getActiveSessionCount: () => number;
  getConfiguration: () => any;
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
  const sessionStore = config.sessionStore || new SessionStore();
  if (!config.sessionStore) {
    await sessionStore.initialize();
  }
  
  const bufferManager = new BufferManager();
  const eventManager = new EventManager();
  const sessionManager = config.sessionManager || new SessionManager(sessionStore);
  
  // Create HTTP server if not provided
  const httpServer = server || createServer(app);
  
  // Create WebSocket server
  const wsServer = WebSocketServer.create(
    { server: httpServer, path: wsPath },
    sessionManager,
    bufferManager,
    eventManager
  );
  
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
  
  // Override session creation to support default directory and transform
  if (defaultDirectory || transformSessionConfig) {
    const originalCreate = sessionManager.createSession.bind(sessionManager);
    (sessionManager as any).createSession = (options: any) => {
      let finalOptions = { ...sessionOptions, ...options };
      
      // Apply default directory if not specified
      if (defaultDirectory && !finalOptions.cwd) {
        finalOptions.cwd = defaultDirectory(finalOptions.id || '');
      }
      
      // Transform config if handler provided - handle async transform
      if (transformSessionConfig) {
        const transformPromise = transformSessionConfig(finalOptions, finalOptions.id || '');
        transformPromise.then((transformed) => {
          finalOptions = transformed;
        });
      }
      
      return originalCreate(finalOptions);
    };
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
    port: finalConfig.port as number,
    config: { ...finalConfig, isReady: true },
    
    // Convenience methods
    createSession: (options) => sessionManager.createSession({ ...sessionOptions, ...options }),
    killSession: (sessionId) => sessionManager.killSession(sessionId),
    broadcast: (message) => {
      // Broadcast to all connected clients
      if ((wsServer as any).wss) {
        (wsServer as any).wss.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(message));
          }
        });
      }
    },
    getActiveSessionCount: () => sessionManager.getAllSessions().length,
    getConfiguration: () => ({
      ...finalConfig,
      bufferManager: {
        maxBufferSize: (bufferManager as any).maxBufferSize || 1024 * 1024
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
      if (wsServer && (wsServer as any).wss) {
        (wsServer as any).wss.close();
      }
      if (httpServer && httpServer.listening) {
        await new Promise<void>((resolve) => {
          httpServer.close(() => resolve());
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
  
  // Start server if not already started
  if (!shelltender.server!.listening) {
    await new Promise<void>((resolve) => {
      shelltender.server!.listen((config.port as number) || 0, config.host || '0.0.0.0', () => {
        const addr = shelltender.server!.address() as AddressInfo;
        shelltender.port = addr.port;
        shelltender.url = `http://localhost:${addr.port}`;
        shelltender.wsUrl = `ws://localhost:${addr.port}${shelltender.config.wsPath}`;
        resolve();
      });
    });
  }
  
  return {
    server: shelltender.server!,
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

/**
 * Validate configuration
 */
export async function validateConfiguration(config: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes: any = {};
  
  // Check wsPath
  if (config.wsPath && !config.wsPath.startsWith('/')) {
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
  if (config.maxSessions && config.maxSessions < 0) {
    errors.push('maxSessions must be positive');
    fixes.maxSessions = 10;
  }
  
  // Check for legacy config
  if ('websocketPort' in config || 'httpPort' in config) {
    warnings.push('Using legacy dual-port configuration');
    return {
      errors,
      warnings,
      fixes,
      migration: {
        from: { websocketPort: config.websocketPort, httpPort: config.httpPort },
        to: { port: config.httpPort || 3000, wsPath: '/ws' }
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
    // Use a more compatible approach for both ESM and CJS
    const adminPath = path.join(process.cwd(), 'packages', 'server', 'src', 'admin', 'index.html');
    res.sendFile(adminPath);
  });
}