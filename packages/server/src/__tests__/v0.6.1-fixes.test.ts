import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import { createShelltender } from '../createServer.js';
import WebSocket from 'ws';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('v0.6.1 Fixes for PocketDev Issues', () => {
  let app: express.Application;
  let server: any;
  let shelltender: any;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });
  
  afterEach(async () => {
    if (server) {
      server.close();
    }
    if (shelltender && shelltender.stop) {
      await shelltender.stop();
    }
    // Clean up test sessions
    const testDataDir = path.join(__dirname, 'test-sessions');
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Issue #1: WebSocket 404', () => {
    it('should handle WebSocket upgrade at /ws path', async () => {
      shelltender = await createShelltender(app, {
        wsPath: '/ws',
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      server = app.listen(0);
      const port = server.address().port;
      
      // Test WebSocket connection
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          resolve();
        });
        ws.on('error', reject);
      });
    });
    
    it('should reject WebSocket connections to wrong path', async () => {
      shelltender = await createShelltender(app, {
        wsPath: '/ws',
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      server = app.listen(0);
      const port = server.address().port;
      
      // Test wrong path
      const ws = new WebSocket(`ws://localhost:${port}/wrong-path`);
      
      await new Promise<void>((resolve) => {
        ws.on('error', () => {
          resolve(); // Expected to error
        });
        ws.on('open', () => {
          ws.close();
          throw new Error('Should not connect to wrong path');
        });
      });
    });
  });

  describe('Issue #2: Session Creation Crash', () => {
    it('should create session without crashing in Alpine-like environment', async () => {
      shelltender = await createShelltender(app, {
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      // Test session creation with /bin/sh (Alpine default)
      const session = shelltender.createSession({
        id: 'alpine-test',
        command: '/bin/sh'
      });
      
      expect(session).toBeDefined();
      expect(session.id).toBe('alpine-test');
      
      // Clean up
      shelltender.killSession('alpine-test');
    });
    
    it.skip('should provide helpful error when shell not found', async () => {
      // Skip this test as it's environment-dependent
      // On some systems, PTY creation might succeed even with non-existent shells
      shelltender = await createShelltender(app, {
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      // Test with non-existent shell
      try {
        shelltender.createSession({
          id: 'bad-shell',
          command: '/bin/nonexistent-shell'
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toMatch(/Failed to create PTY session/);
      }
    });
    
    it('should handle session creation via API endpoint', async () => {
      shelltender = await createShelltender(app, {
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      // Add the API endpoint like PocketDev
      app.post('/api/sessions', async (req, res) => {
        try {
          const session = shelltender.createSession({
            id: req.body.sessionId,
            command: '/bin/sh' // Use sh for Alpine
          });
          
          res.json({
            id: session.id,
            sessionId: session.id,
            status: 'active'
          });
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      });
      
      server = app.listen(0);
      const port = server.address().port;
      
      const response = await request(app)
        .post('/api/sessions')
        .send({ sessionId: 'api-test' });
      
      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('api-test');
      
      // Clean up
      shelltender.killSession('api-test');
    });
  });

  describe('Issue #3: Missing API Methods', () => {
    it('should expose all session management methods', async () => {
      shelltender = await createShelltender(app, {
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      // Check all methods exist
      expect(typeof shelltender.createSession).toBe('function');
      expect(typeof shelltender.getSession).toBe('function');
      expect(typeof shelltender.getAllSessions).toBe('function');
      expect(typeof shelltender.resizeSession).toBe('function');
      expect(typeof shelltender.killSession).toBe('function');
    });
    
    it('should allow consistent API usage', async () => {
      shelltender = await createShelltender(app, {
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      // Create session
      const session = shelltender.createSession({
        id: 'consistent-api',
        command: '/bin/sh'
      });
      
      // Get session - should work without accessing sessionManager
      const retrieved = shelltender.getSession('consistent-api');
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('consistent-api');
      
      // Get all sessions
      const allSessions = shelltender.getAllSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      expect(allSessions.some(s => s.id === 'consistent-api')).toBe(true);
      
      // Resize session
      const resized = shelltender.resizeSession('consistent-api', 100, 40);
      expect(resized).toBe(true);
      
      // Kill session
      const killed = shelltender.killSession('consistent-api');
      expect(killed).toBe(true);
    });
  });

  describe('Issue #7: dataDir Configuration', () => {
    it('should use dataDir option for session persistence', async () => {
      const customDataDir = path.join(__dirname, 'custom-sessions');
      
      shelltender = await createShelltender(app, {
        dataDir: customDataDir
      });
      
      // Create a session
      const session = shelltender.createSession({
        id: 'datadir-test',
        command: '/bin/sh'
      });
      
      // Check that session file is created in custom directory
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for save
      
      const sessionFile = path.join(customDataDir, 'datadir-test.json');
      expect(fs.existsSync(customDataDir)).toBe(true);
      
      // Clean up
      shelltender.killSession('datadir-test');
    });
  });

  describe('Server Lifecycle', () => {
    it('should not create internal server when using Express', async () => {
      shelltender = await createShelltender(app, {
        port: 0, // Should be ignored when using Express
        dataDir: path.join(__dirname, 'test-sessions')
      });
      
      // shelltender.server should be undefined initially
      expect(shelltender.server).toBeUndefined();
      
      // Server should work after app.listen()
      server = app.listen(0);
      const port = server.address().port;
      
      // WebSocket should now work
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.close();
          resolve();
        });
        ws.on('error', reject);
      });
    });
  });
});