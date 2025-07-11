import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createShelltender, detectEnvironment, validateConfiguration } from '../createServer.js';
import express from 'express';
import { WebSocket } from 'ws';

describe('Auto-Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    it('should detect Docker environment', async () => {
      process.env.DOCKER_CONTAINER = 'true';
      
      const env = await detectEnvironment();
      
      expect(env).toMatchObject({
        isDocker: true,
        host: '0.0.0.0',
        suggestions: expect.arrayContaining([
          'Using 0.0.0.0 for Docker compatibility'
        ])
      });
    });

    it('should detect Kubernetes environment', async () => {
      process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';
      
      const env = await detectEnvironment();
      
      expect(env).toMatchObject({
        isKubernetes: true,
        host: '0.0.0.0',
        suggestions: expect.arrayContaining([
          'Detected Kubernetes environment'
        ])
      });
    });

    it('should detect common CI environments', async () => {
      const ciEnvs = ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'JENKINS_URL'];
      
      for (const envVar of ciEnvs) {
        process.env = { ...originalEnv, [envVar]: 'true' };
        
        const env = await detectEnvironment();
        
        expect(env.isCI).toBe(true);
        expect(env.suggestions).toContain('Running in CI environment - using minimal configuration');
      }
    });

    it('should detect development vs production', async () => {
      // Development
      process.env.NODE_ENV = 'development';
      let env = await detectEnvironment();
      expect(env.isDevelopment).toBe(true);
      expect(env.enableDevTools).toBe(true);
      
      // Production
      process.env.NODE_ENV = 'production';
      env = await detectEnvironment();
      expect(env.isProduction).toBe(true);
      expect(env.enableDevTools).toBe(false);
    });

    it('should detect common proxy setups', async () => {
      // Nginx headers
      const app = express();
      app.set('trust proxy', true);
      
      const env = await detectEnvironment({ app });
      
      expect(env.behindProxy).toBe(true);
      expect(env.suggestions).toContain('Detected proxy setup - WebSocket URLs will use X-Forwarded headers');
    });
  });

  describe('Port Conflict Detection', () => {
    it('should detect and suggest alternative ports', async () => {
      const app = express();
      
      // Simulate port in use
      const blocker = app.listen(3000);
      
      try {
        const shelltender = await createShelltender(app, { port: 3000 });
      } catch (error: any) {
        expect(error.code).toBe('EADDRINUSE');
        expect(error.suggestions).toContain('Port 3000 is in use. Try: 3001, 3002, or 3003');
        expect(error.availablePorts).toEqual([3001, 3002, 3003]);
      }
      
      blocker.close();
    });

    it('should automatically find free port if requested', async () => {
      const app = express();
      const shelltender = await createShelltender(app, { 
        port: 'auto' // Special value for auto-detection
      });
      
      expect(shelltender.port).toBeGreaterThan(0);
      expect(shelltender.port).not.toBe(80); // Not a privileged port
      
      shelltender.stop();
    });
  });

  describe('Security Auto-Configuration', () => {
    it('should enable strict security in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const app = express();
      const shelltender = await createShelltender(app);
      
      const config = shelltender.getConfiguration();
      
      expect(config.security).toMatchObject({
        enableHelmet: true,
        enableCors: true,
        corsOrigin: false, // Strict CORS
        enableRateLimiting: true,
        maxRequestsPerMinute: 60,
        enableSessionTimeout: true,
        sessionTimeoutMs: 3600000 // 1 hour
      });
      
      shelltender.stop();
    });

    it('should relax security in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const app = express();
      const shelltender = await createShelltender(app);
      
      const config = shelltender.getConfiguration();
      
      expect(config.security).toMatchObject({
        enableHelmet: false,
        enableCors: true,
        corsOrigin: '*', // Allow all origins in dev
        enableRateLimiting: false,
        enableSessionTimeout: false
      });
      
      shelltender.stop();
    });

    it('should detect and configure for common security headers', async () => {
      const app = express();
      
      // Simulate requests with security headers
      const shelltender = await createShelltender(app, {
        detectSecurityHeaders: true
      });
      
      // Mock request with JWT
      const mockReq = {
        headers: {
          'authorization': 'Bearer token123',
          'x-api-key': 'key123'
        }
      };
      
      const security = shelltender.detectSecurityRequirements(mockReq);
      
      expect(security).toMatchObject({
        hasAuth: true,
        authType: 'bearer',
        hasApiKey: true,
        recommendations: [
          'Enable session-based auth for terminals',
          'Consider rate limiting by API key'
        ]
      });
      
      shelltender.stop();
    });
  });

  describe('Performance Auto-Tuning', () => {
    it('should adjust buffer sizes based on available memory', async () => {
      const app = express();
      const shelltender = await createShelltender(app);
      
      const config = shelltender.getConfiguration();
      const totalMemory = require('os').totalmem();
      
      if (totalMemory > 8 * 1024 * 1024 * 1024) { // > 8GB
        expect(config.bufferManager.maxBufferSize).toBeGreaterThan(1024 * 1024);
      } else {
        expect(config.bufferManager.maxBufferSize).toBeLessThanOrEqual(1024 * 1024);
      }
      
      shelltender.stop();
    });

    it('should optimize for containerized environments', async () => {
      process.env.DOCKER_CONTAINER = 'true';
      
      // Mock cgroup memory limit (common in containers)
      const app = express();
      const shelltender = await createShelltender(app);
      
      const config = shelltender.getConfiguration();
      
      expect(config.performance).toMatchObject({
        maxSessions: expect.any(Number), // Limited based on container memory
        bufferStrategy: 'conservative',
        gcInterval: 30000 // More aggressive GC in containers
      });
      
      shelltender.stop();
    });
  });

  describe('Framework Detection', () => {
    it('should detect Next.js and configure accordingly', async () => {
      // Simulate Next.js environment
      process.env.NEXT_RUNTIME = 'nodejs';
      
      const app = express();
      const shelltender = await createShelltender(app);
      
      const config = shelltender.getConfiguration();
      
      expect(config.framework).toBe('nextjs');
      expect(config.apiRoutePrefix).toBe('/api/shelltender');
      expect(config.suggestions).toContain('Add shelltender to next.config.js for optimal setup');
      
      shelltender.stop();
    });

    it('should detect Vite dev server', async () => {
      process.env.VITE_USER_NODE_ENV = 'development';
      
      const app = express();
      const shelltender = await createShelltender(app);
      
      const config = shelltender.getConfiguration();
      
      expect(config.framework).toBe('vite');
      expect(config.corsOrigin).toContain('localhost:5173');
      
      shelltender.stop();
    });
  });

  describe('Diagnostic Doctor Endpoint', () => {
    it('should provide comprehensive health check', async () => {
      const app = express();
      const shelltender = await createShelltender(app);
      
      const server = app.listen(0);
      const port = (server.address() as any).port;
      
      const doctor = await fetch(`http://localhost:${port}/api/shelltender/doctor`)
        .then(r => r.json());
      
      expect(doctor).toMatchObject({
        status: expect.stringMatching(/healthy|warning|error/),
        timestamp: expect.any(String),
        checks: {
          server: expect.any(Object),
          websocket: expect.any(Object),
          pipeline: expect.any(Object),
          sessions: expect.any(Object),
          memory: expect.any(Object),
          disk: expect.any(Object)
        },
        config: expect.any(Object),
        suggestions: expect.any(Array),
        quickFixes: expect.any(Array)
      });
      
      server.close();
      shelltender.stop();
    });

    it('should detect missing xterm CSS in client', async () => {
      const app = express();
      const shelltender = await createShelltender(app);
      
      // Simulate client check
      const clientCheck = await shelltender.checkClientSetup({
        hasXtermCss: false,
        hasProviders: true
      });
      
      expect(clientCheck.issues).toContain('Missing xterm.css import');
      expect(clientCheck.fixes).toContain("import '@xterm/xterm/css/xterm.css'");
    });

    it('should detect WebSocket connection issues', async () => {
      const app = express();
      const shelltender = await createShelltender(app);
      
      const server = app.listen(0);
      const port = (server.address() as any).port;
      
      // Try to connect with wrong path
      const ws = new WebSocket(`ws://localhost:${port}/wrong-path`);
      
      await new Promise((resolve) => {
        ws.on('error', resolve);
        ws.on('close', resolve);
      });
      
      // Doctor should detect the failed connection attempt
      const doctor = await fetch(`http://localhost:${port}/api/shelltender/doctor`)
        .then(r => r.json());
      
      expect(doctor.checks.websocket.recentErrors).toBeGreaterThan(0);
      expect(doctor.suggestions).toContain('WebSocket connections failing - check path configuration');
      
      server.close();
      shelltender.stop();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate and suggest fixes for common mistakes', async () => {
      const validation = await validateConfiguration({
        wsPath: 'ws', // Missing leading slash
        port: '3000', // String instead of number
        enablePipeline: 'yes', // String instead of boolean
        maxSessions: -1 // Invalid negative number
      });
      
      expect(validation.errors).toHaveLength(4);
      expect(validation.fixes).toMatchObject({
        wsPath: '/ws',
        port: 3000,
        enablePipeline: true,
        maxSessions: 10
      });
    });

    it('should provide helpful migration hints', async () => {
      const validation = await validateConfiguration({
        // Old v0.4.x style config
        websocketPort: 8081,
        httpPort: 3000
      });
      
      expect(validation.warnings).toContain('Using legacy dual-port configuration');
      expect(validation.migration).toMatchObject({
        from: { websocketPort: 8081, httpPort: 3000 },
        to: { port: 3000, wsPath: '/ws' }
      });
    });
  });
});