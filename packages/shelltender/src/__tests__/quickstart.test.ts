import { describe, it, expect, afterEach } from 'vitest';
import { startServer, createFullStackApp } from '../quickstart.js';
import { WebSocket } from 'ws';

describe('Combined Package Quickstart API', () => {
  let instance: any;

  afterEach(async () => {
    if (instance?.stop) {
      await instance.stop();
    }
  });

  describe('startServer - Absolute simplest server setup', () => {
    it('should start a complete Shelltender server with one function call', async () => {
      instance = await startServer();
      
      // Should return useful information
      expect(instance.port).toBeGreaterThan(0);
      expect(instance.url).toMatch(/http:\/\/localhost:\d+/);
      expect(instance.wsUrl).toMatch(/ws:\/\/localhost:\d+\/ws/);
      
      // Should be immediately ready for connections
      const ws = new WebSocket(instance.wsUrl);
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });
      
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should use sensible defaults', async () => {
      instance = await startServer();
      
      const health = await fetch(`${instance.url}/api/health`).then(r => r.json());
      
      expect(health).toMatchObject({
        status: 'ok',
        mode: 'single-port',
        wsPath: '/ws',
        features: {
          pipeline: true,
          security: true,
          persistence: true
        }
      });
    });

    it('should accept simple configuration', async () => {
      instance = await startServer({
        port: 0, // Random port
        sessionTimeout: 60000,
        maxSessions: 10
      });
      
      const status = await fetch(`${instance.url}/api/shelltender/status`).then(r => r.json());
      
      expect(status.config.maxSessions).toBe(10);
      expect(status.config.sessionTimeout).toBe(60000);
    });

    it('should log friendly startup message', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      instance = await startServer();
      
      // Should show friendly message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🚀 Shelltender is ready!'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(instance.url));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('React component: <Terminal />'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('createFullStackApp - Complete app with frontend', () => {
    it('should create backend + serve frontend build', async () => {
      instance = await createFullStackApp({
        port: 0,
        clientPath: './dist' // Would contain built React app
      });
      
      expect(instance.port).toBeGreaterThan(0);
      
      // Should serve API
      const health = await fetch(`${instance.url}/api/health`).then(r => r.json());
      expect(health.status).toBe('ok');
      
      // Should serve static files (would serve index.html in real scenario)
      const response = await fetch(`${instance.url}/`);
      expect(response.status).toBeLessThan(500);
    });

    it('should include development mode with auto-reload', async () => {
      instance = await createFullStackApp({
        port: 0,
        dev: true
      });
      
      const devStatus = await fetch(`${instance.url}/api/dev/status`).then(r => r.json());
      
      expect(devStatus).toMatchObject({
        mode: 'development',
        features: {
          hotReload: true,
          errorOverlay: true,
          sourceMaps: true
        }
      });
    });
  });

  describe('Environment-based configuration', () => {
    it('should read from .env file automatically', async () => {
      // Create temporary .env
      process.env.SHELLTENDER_PORT = '0';
      process.env.SHELLTENDER_SESSION_TIMEOUT = '30000';
      process.env.SHELLTENDER_ENABLE_AUDIT = 'true';
      
      instance = await startServer();
      
      const config = await fetch(`${instance.url}/api/shelltender/config`).then(r => r.json());
      
      expect(config.sessionTimeout).toBe(30000);
      expect(config.enableAudit).toBe(true);
      
      // Cleanup
      delete process.env.SHELLTENDER_PORT;
      delete process.env.SHELLTENDER_SESSION_TIMEOUT;
      delete process.env.SHELLTENDER_ENABLE_AUDIT;
    });

    it('should provide Docker-ready configuration', async () => {
      process.env.DOCKER_CONTAINER = 'true';
      
      instance = await startServer();
      
      const config = await fetch(`${instance.url}/api/shelltender/config`).then(r => r.json());
      
      expect(config.host).toBe('0.0.0.0');
      expect(config.dockerOptimized).toBe(true);
      
      delete process.env.DOCKER_CONTAINER;
    });
  });

  describe('CLI commands', () => {
    it('should support doctor command for diagnostics', async () => {
      instance = await startServer();
      
      const doctor = await fetch(`${instance.url}/api/shelltender/doctor`).then(r => r.json());
      
      expect(doctor).toMatchObject({
        status: 'healthy',
        checks: {
          server: { status: 'ok', message: 'Server is running' },
          websocket: { status: 'ok', message: 'WebSocket server is ready' },
          pipeline: { status: 'ok', message: 'Pipeline is connected' },
          security: { status: 'ok', message: 'Security filters are active' }
        },
        suggestions: []
      });
    });

    it('should detect common issues', async () => {
      // Start server without required dependencies (simulated)
      process.env.SHELLTENDER_SKIP_PIPELINE = 'true';
      
      instance = await startServer();
      
      const doctor = await fetch(`${instance.url}/api/shelltender/doctor`).then(r => r.json());
      
      expect(doctor.status).toBe('warning');
      expect(doctor.checks.pipeline.status).toBe('warning');
      expect(doctor.suggestions).toContain('Enable pipeline for production use');
      
      delete process.env.SHELLTENDER_SKIP_PIPELINE;
    });
  });

  describe('Integration with popular frameworks', () => {
    it('should provide Next.js integration', async () => {
      const { withShelltender } = await import('../integrations/nextjs.js');
      
      const nextConfig = withShelltender({
        // Normal Next.js config
      });
      
      expect(nextConfig.rewrites).toBeDefined();
      expect(nextConfig.serverRuntimeConfig.shelltender).toBeDefined();
    });

    it('should provide Vite plugin', async () => {
      const { shelltenderPlugin } = await import('../integrations/vite.js');
      
      const plugin = shelltenderPlugin();
      
      expect(plugin.name).toBe('vite-plugin-shelltender');
      expect(plugin.configureServer).toBeDefined();
    });

    it('should provide Create React App integration', async () => {
      const { setupProxy } = await import('../integrations/cra.js');
      
      const app = { use: vi.fn() };
      setupProxy(app as any);
      
      expect(app.use).toHaveBeenCalledWith('/ws', expect.any(Function));
      expect(app.use).toHaveBeenCalledWith('/api', expect.any(Function));
    });
  });
});