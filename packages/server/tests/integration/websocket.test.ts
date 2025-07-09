import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { createServer } from 'http';
import { WebSocketServer } from '../../src/WebSocketServer.js';
import { SessionManager } from '../../src/SessionManager.js';
import { BufferManager } from '../../src/BufferManager.js';
import { SessionStore } from '../../src/SessionStore.js';

// Mock node-pty with proper structure
vi.mock('node-pty', () => {
  const mockPtyProcess = {
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  };
  
  return {
    spawn: vi.fn(() => mockPtyProcess)
  };
});

// Mock SessionStore to prevent file operations
vi.mock('../../src/SessionStore.js', () => {
  const mockStore = {
    loadAllSessions: vi.fn().mockResolvedValue(new Map()),
    saveSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    deleteAllSessions: vi.fn().mockResolvedValue(undefined),
    updateSessionBuffer: vi.fn().mockResolvedValue(undefined)
  };
  
  return {
    SessionStore: vi.fn(() => mockStore)
  };
});

describe('WebSocket Integration', () => {
  let wsServer: WebSocketServer | null = null;
  let sessionManager: SessionManager;
  let bufferManager: BufferManager;
  let sessionStore: SessionStore;
  let clients: WebSocket[] = [];
  let testPort = 8081;

  beforeEach(async () => {
    // Find an available port
    testPort = 8081 + Math.floor(Math.random() * 1000);
    
    bufferManager = new BufferManager();
    sessionStore = new SessionStore('.test-sessions-' + Date.now());
    // Mock initialize if it doesn't exist (for backwards compatibility in tests)
    if (!sessionStore.initialize) {
      sessionStore.initialize = async () => {};
    }
    await sessionStore.initialize();
    sessionManager = new SessionManager(sessionStore);
    
    wsServer = WebSocketServer.create(testPort, sessionManager, bufferManager);
  });

  afterEach(async () => {
    // Close all clients
    for (const client of clients) {
      if (client && client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    clients = [];
    
    if (wsServer) {
      // Close the WebSocket server
      await new Promise<void>((resolve) => {
        (wsServer as any).wss.close(() => resolve());
      });
      wsServer = null;
    }
  }, 20000);

  const connectClient = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${testPort}`);
      clients.push(client);
      
      client.on('open', () => resolve(client));
      client.on('error', reject);
    });
  };

  const waitForMessage = (ws: WebSocket): Promise<any> => {
    return new Promise((resolve) => {
      ws.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  };

  describe('session creation', () => {
    it('should create a new session', async () => {
      const ws = await connectClient();
      const messagePromise = waitForMessage(ws);
      
      ws.send(JSON.stringify({
        type: 'create',
        cols: 80,
        rows: 24
      }));
      
      const response = await messagePromise;
      expect(response.type).toBe('created');
      expect(response.sessionId).toBeDefined();
      expect(response.session).toMatchObject({
        id: expect.any(String),
        cols: 80,
        rows: 24
      });
    });

    it('should create a restricted session', async () => {
      const ws = await connectClient();
      const messagePromise = waitForMessage(ws);
      
      ws.send(JSON.stringify({
        type: 'create',
        options: {
          restrictToPath: '/tmp/test',
          blockedCommands: ['rm', 'sudo'],
          readOnlyMode: true
        }
      }));
      
      const response = await messagePromise;
      expect(response.type).toBe('created');
      expect(response.sessionId).toBeDefined();
    });
  });

  describe('session connection', () => {
    it('should connect to existing session', async () => {
      // First create a session
      const ws1 = await connectClient();
      let messagePromise = waitForMessage(ws1);
      
      ws1.send(JSON.stringify({ type: 'create' }));
      const createResponse = await messagePromise;
      const sessionId = createResponse.sessionId;
      
      // Connect with second client
      const ws2 = await connectClient();
      messagePromise = waitForMessage(ws2);
      
      ws2.send(JSON.stringify({
        type: 'connect',
        sessionId
      }));
      
      const connectResponse = await messagePromise;
      expect(connectResponse.type).toBe('connect');
      expect(connectResponse.sessionId).toBe(sessionId);
      expect(connectResponse.scrollback).toBeDefined();
    });

    it('should handle non-existent session', async () => {
      const ws = await connectClient();
      const messagePromise = waitForMessage(ws);
      
      ws.send(JSON.stringify({
        type: 'connect',
        sessionId: 'non-existent'
      }));
      
      const response = await messagePromise;
      expect(response.type).toBe('error');
      expect(response.data).toBe('Session not found');
    });
  });

  describe('input/output', () => {
    it('should handle input commands', async () => {
      const ws = await connectClient();
      let messagePromise = waitForMessage(ws);
      
      ws.send(JSON.stringify({ type: 'create' }));
      const createResponse = await messagePromise;
      
      // Send input
      ws.send(JSON.stringify({
        type: 'input',
        sessionId: createResponse.sessionId,
        data: 'echo "test"\n'
      }));
      
      // Should receive output (mocked)
      // In real implementation, PTY would send output back
    });
  });

  describe('resize', () => {
    it('should handle terminal resize', async () => {
      const ws = await connectClient();
      let messagePromise = waitForMessage(ws);
      
      ws.send(JSON.stringify({ type: 'create' }));
      const createResponse = await messagePromise;
      
      ws.send(JSON.stringify({
        type: 'resize',
        sessionId: createResponse.sessionId,
        cols: 120,
        rows: 40
      }));
      
      // Wait a bit for the resize to process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify session was resized
      const session = sessionManager.getSession(createResponse.sessionId);
      expect(session?.cols).toBe(120);
      expect(session?.rows).toBe(40);
    });
  });
});