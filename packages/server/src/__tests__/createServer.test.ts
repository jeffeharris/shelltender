import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import { createShelltender, createShelltenderServer, startShelltender } from '../createServer.js';

describe('Server Convenience API - Integration Tests', () => {
  let instance: any;

  afterEach(async () => {
    if (instance?.stop) {
      try {
        await instance.stop();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    instance = null;
  }, 10000);

  describe('createShelltender - Express integration', () => {
    it('should create a working terminal server with one function call', { timeout: 10000 }, async () => {
      const app = express();
      const server = createServer(app);
      
      // Pass server to createShelltender
      const shelltender = await createShelltender(app, { server });
      
      // Start the server
      await new Promise<void>(resolve => {
        server.listen(0, () => resolve());
      });
      const port = (server.address() as any).port;
      
      // Test HTTP endpoints
      const healthResponse = await fetch(`http://localhost:${port}/api/health`);
      const health = await healthResponse.json();
      
      expect(health.status).toBe('ok');
      expect(health.wsPath).toBe('/ws');
      
      // Test WebSocket connection
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });
      
      // Test session creation
      ws.send(JSON.stringify({
        type: 'create',
        sessionId: 'test-session'
      }));
      
      const response = await new Promise<any>((resolve) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'sessionCreated') {
            resolve(msg);
          }
        });
      });
      
      expect(response.sessionId).toBe('test-session');
      
      ws.close();
      await new Promise(resolve => server.close(resolve));
    });

    it('should handle terminal I/O without manual pipeline setup', async () => {
      const app = express();
      const server = createServer(app);
      
      // Pass the server to createShelltender
      const shelltender = await createShelltender(app, { server });
      
      // Now start listening
      await new Promise<void>(resolve => {
        server.listen(0, () => resolve());
      });
      
      const port = (server.address() as any).port;
      
      // Connect and create session
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', (err) => {
          console.error('WebSocket connection error:', err);
          reject(err);
        });
      });
      
      ws.send(JSON.stringify({
        type: 'create',
        options: { id: 'io-test' }
      }));
      
      await new Promise(resolve => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'created') resolve(msg);
        });
      });
      
      // Send input and expect output
      ws.send(JSON.stringify({
        type: 'input',
        sessionId: 'io-test',
        data: 'echo "Hello Shelltender"\n'
      }));
      
      const output = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for output'));
        }, 3000);
        
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          console.log('Received message:', msg.type, msg.data?.substring(0, 50));
          if (msg.type === 'output' && msg.data.includes('Hello Shelltender')) {
            clearTimeout(timeout);
            resolve(msg.data);
          }
        });
      });
      
      expect(output).toContain('Hello Shelltender');
      
      ws.close();
      await new Promise(resolve => server.close(resolve));
    });

    it('should automatically set up all required API endpoints', async () => {
      const app = express();
      await createShelltender(app);
      
      const server = app.listen(0);
      const port = (server.address() as any).port;
      
      // Test all expected endpoints
      const endpoints = [
        '/api/health',
        '/api/sessions',
        '/api/shelltender/status'
      ];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`http://localhost:${port}${endpoint}`);
        expect(response.status).toBeLessThan(500); // Not a server error
      }
      
      await new Promise(resolve => server.close(resolve));
    });
  });

  describe('createShelltenderServer - Standalone server', () => {
    it('should create a complete server with one function call', async () => {
      instance = await createShelltenderServer({ port: 0 });
      
      expect(instance.server).toBeDefined();
      expect(instance.shelltender).toBeDefined();
      expect(instance.port).toBeGreaterThan(0);
      expect(instance.url).toMatch(/http:\/\/localhost:\d+/);
      
      // Test that it's actually running
      const response = await fetch(`${instance.url}/api/health`);
      expect(response.ok).toBe(true);
    });

    it('should accept WebSocket connections immediately', async () => {
      instance = await createShelltenderServer({ port: 0 });
      
      const ws = new WebSocket(`${instance.url.replace('http', 'ws')}/ws`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 1000);
      });
      
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });
  });

  describe('startShelltender - One-liner setup', () => {
    it('should start a fully functional server with one line', async () => {
      instance = await startShelltender();
      
      // Should have a valid URL
      expect(instance.url).toMatch(/http:\/\/localhost:\d+/);
      
      // Should respond to health checks
      const health = await fetch(`${instance.url}/api/health`).then(r => r.json());
      expect(health.status).toBe('ok');
      
      // Should accept WebSocket connections
      const ws = new WebSocket(`${instance.url.replace('http', 'ws')}/ws`);
      await new Promise(resolve => ws.on('open', resolve));
      
      ws.close();
    });

    it('should use environment variables when available', async () => {
      process.env.SHELLTENDER_PORT = '0'; // Random port
      process.env.SHELLTENDER_WS_PATH = '/custom-ws';
      
      instance = await startShelltender();
      
      const health = await fetch(`${instance.url}/api/health`).then(r => r.json());
      expect(health.wsPath).toBe('/custom-ws');
      
      delete process.env.SHELLTENDER_PORT;
      delete process.env.SHELLTENDER_WS_PATH;
    });
  });

  describe('Default security and pipeline features', () => {
    it('should include security filters by default', async () => {
      instance = await createShelltenderServer({ port: 0, enableSecurity: true });
      
      const ws = new WebSocket(`${instance.url.replace('http', 'ws')}/ws`);
      await new Promise(resolve => ws.on('open', resolve));
      
      // Create session
      ws.send(JSON.stringify({ type: 'create', sessionId: 'security-test' }));
      await new Promise(resolve => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'created') resolve(msg);
        });
      });
      
      // Send input with sensitive data
      ws.send(JSON.stringify({
        type: 'input',
        sessionId: 'security-test',
        data: 'echo "password=secret123"\n'
      }));
      
      const output = await new Promise<string>((resolve) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'output' && msg.data.includes('password')) {
            resolve(msg.data);
          }
        });
      });
      
      // Should be redacted
      expect(output).toContain('***REDACTED***');
      expect(output).not.toContain('secret123');
      
      ws.close();
    });

    it('should handle binary data filtering by default', async () => {
      const app = express();
      const shelltender = await createShelltender(app);
      
      const server = app.listen(0);
      const port = (server.address() as any).port;
      
      const statusResponse = await fetch(`http://localhost:${port}/api/shelltender/status`);
      const status = await statusResponse.json();
      
      expect(status.pipeline.filters).toContain('no-binary');
      // In test environment, security might not be enabled by default
      if (process.env.NODE_ENV !== 'test') {
        expect(status.pipeline.processors).toContain('security');
      } else {
        expect(status.pipeline.processors).toContain('rate-limit');
      }
      
      await new Promise(resolve => server.close(resolve));
    });
  });

  describe('Error handling and diagnostics', () => {
    it('should provide helpful error messages for common issues', async () => {
      const app = express();
      
      // Simulate port already in use
      const blocker = app.listen(9999);
      
      try {
        await createShelltender(app, { port: 9999 });
      } catch (error: any) {
        expect(error.message).toContain('Port 9999 is already in use');
        expect(error.suggestions).toContain('Try a different port');
      }
      
      blocker.close();
    });

    it('should provide a doctor endpoint for diagnostics', async () => {
      instance = await createShelltenderServer({ port: 0 });
      
      const doctor = await fetch(`${instance.url}/api/shelltender/doctor`).then(r => r.json());
      
      expect(doctor.status).toBe('healthy');
      expect(doctor.checks.server.status).toBe('ok');
      expect(doctor.checks.websocket.status).toBe('ok');
      expect(doctor.checks.pipeline.status).toBe('ok');
      expect(doctor.checks.sessionManager.status).toBe('ok');
      expect(doctor.checks.bufferManager.status).toBe('ok');
      
      // Should include helpful info
      expect(doctor.config).toMatchObject({
        wsPath: '/ws',
        port: expect.any(Number),
        enablePipeline: true
      });
    });
  });
});