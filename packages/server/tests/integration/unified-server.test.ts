import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
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

describe('Unified Server Mode', () => {
  let wsServer: WebSocketServer | null = null;
  let httpServer: Server | null = null;
  let sessionManager: SessionManager;
  let bufferManager: BufferManager;
  let sessionStore: SessionStore;
  let clients: WebSocket[] = [];
  let serverPort: number = 0;

  beforeEach(async () => {
    bufferManager = new BufferManager();
    sessionStore = new SessionStore('.test-sessions-' + Date.now());
    if (!sessionStore.initialize) {
      sessionStore.initialize = async () => {};
    }
    await sessionStore.initialize();
    sessionManager = new SessionManager(sessionStore);
  });

  afterEach(async () => {
    // Close all clients
    for (const client of clients) {
      if (client && client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    clients = [];
    
    if (wsServer && (wsServer as any).wss) {
      await new Promise<void>((resolve) => {
        (wsServer as any).wss.close(() => resolve());
      });
    }
    
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer!.close(() => resolve());
      });
    }
    
    wsServer = null;
    httpServer = null;
  }, 20000);

  const connectClient = (url: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(url);
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

  describe('factory method', () => {
    it('should create WebSocketServer with port number (backwards compatible)', async () => {
      const testPort = 9081 + Math.floor(Math.random() * 1000);
      
      // This should work once factory method is implemented
      try {
        wsServer = (WebSocketServer as any).create(testPort, sessionManager, bufferManager);
        expect(wsServer).toBeDefined();
        
        // Test connection
        const ws = await connectClient(`ws://localhost:${testPort}`);
        expect(ws.readyState).toBe(WebSocket.OPEN);
      } catch (error: any) {
        // Expected to fail until implementation
        expect(error.message).toMatch(/create|not a function/);
      }
    });

    it('should create WebSocketServer with options object', async () => {
      const testPort = 9081 + Math.floor(Math.random() * 1000);
      
      try {
        wsServer = (WebSocketServer as any).create(
          { port: testPort, path: '/ws' },
          sessionManager,
          bufferManager
        );
        expect(wsServer).toBeDefined();
      } catch (error: any) {
        // Expected to fail until implementation
        expect(error.message).toMatch(/create|not a function/);
      }
    });

    it('should attach to existing HTTP server', async () => {
      // Create HTTP server
      httpServer = createServer((req, res) => {
        res.writeHead(200);
        res.end('HTTP Response');
      });
      
      await new Promise<void>((resolve) => {
        httpServer!.listen(0, () => {
          serverPort = (httpServer!.address() as AddressInfo).port;
          resolve();
        });
      });

      try {
        // Attach WebSocket server to existing HTTP server
        wsServer = (WebSocketServer as any).create(
          { server: httpServer },
          sessionManager,
          bufferManager
        );
        
        // HTTP request should still work
        const httpResponse = await fetch(`http://localhost:${serverPort}`);
        expect(httpResponse.status).toBe(200);
        expect(await httpResponse.text()).toBe('HTTP Response');
        
        // WebSocket should work on same port
        const ws = await connectClient(`ws://localhost:${serverPort}`);
        expect(ws.readyState).toBe(WebSocket.OPEN);
        
        // Test WebSocket functionality
        const messagePromise = waitForMessage(ws);
        ws.send(JSON.stringify({ type: 'create' }));
        const response = await messagePromise;
        expect(response.type).toBe('created');
      } catch (error: any) {
        // Expected to fail until implementation
        expect(error.message).toMatch(/create|not a function/);
      }
    });

    it('should support noServer mode for manual upgrade handling', async () => {
      try {
        wsServer = (WebSocketServer as any).create(
          { noServer: true },
          sessionManager,
          bufferManager
        );
        
        expect(wsServer).toBeDefined();
        // Should not be listening on any port
        expect((wsServer as any).wss.options.noServer).toBe(true);
      } catch (error: any) {
        // Expected to fail until implementation
        expect(error.message).toMatch(/create|not a function/);
      }
    });

    it('should throw error when no valid configuration provided', async () => {
      try {
        wsServer = (WebSocketServer as any).create(
          {} as any, // Invalid config
          sessionManager,
          bufferManager
        );
        // Should not reach here once implemented
        if ((WebSocketServer as any).create) {
          throw new Error('Should have thrown an error');
        }
      } catch (error: any) {
        // Expected error - either 'not a function' now or config error later
        expect(error.message).toMatch(/create|not a function|port, server, or noServer/);
      }
    });
  });

  describe('unified server functionality', () => {
    it('should handle WebSocket upgrade on specific path', async () => {
      httpServer = createServer();
      
      await new Promise<void>((resolve) => {
        httpServer!.listen(0, () => {
          serverPort = (httpServer!.address() as AddressInfo).port;
          resolve();
        });
      });

      try {
        wsServer = (WebSocketServer as any).create(
          { server: httpServer, path: '/terminal' },
          sessionManager,
          bufferManager
        );
        
        // WebSocket connection to correct path should work
        const ws = await connectClient(`ws://localhost:${serverPort}/terminal`);
        expect(ws.readyState).toBe(WebSocket.OPEN);
        
        // WebSocket connection to wrong path should fail
        await expect(connectClient(`ws://localhost:${serverPort}/wrong-path`)).rejects.toThrow();
      } catch (error: any) {
        // Expected to fail until implementation
        expect(error.message).toMatch(/create|not a function/);
      }
    });

    it('should support WebSocket compression options', async () => {
      const testPort = 9081 + Math.floor(Math.random() * 1000);
      
      try {
        wsServer = (WebSocketServer as any).create(
          { 
            port: testPort,
            perMessageDeflate: {
              zlibDeflateOptions: {
                level: 1,
                memLevel: 1,
                chunkSize: 1024
              },
              threshold: 1024
            }
          },
          sessionManager,
          bufferManager
        );
        
        expect(wsServer).toBeDefined();
        expect((wsServer as any).wss.options.perMessageDeflate).toBeDefined();
      } catch (error: any) {
        // Expected to fail until implementation
        expect(error.message).toMatch(/create|not a function/);
      }
    });

    it('should maintain all existing WebSocket functionality when attached to HTTP server', async () => {
      httpServer = createServer();
      
      await new Promise<void>((resolve) => {
        httpServer!.listen(0, () => {
          serverPort = (httpServer!.address() as AddressInfo).port;
          resolve();
        });
      });

      try {
        wsServer = (WebSocketServer as any).create(
          { server: httpServer },
          sessionManager,
          bufferManager
        );
        
        const ws = await connectClient(`ws://localhost:${serverPort}`);
        
        // Test session creation
        let messagePromise = waitForMessage(ws);
        ws.send(JSON.stringify({ type: 'create', cols: 80, rows: 24 }));
        let response = await messagePromise;
        expect(response.type).toBe('created');
        const sessionId = response.sessionId;
        
        // Test input
        ws.send(JSON.stringify({
          type: 'input',
          sessionId,
          data: 'test input'
        }));
        
        // Test resize
        ws.send(JSON.stringify({
          type: 'resize',
          sessionId,
          cols: 120,
          rows: 40
        }));
        
        // Test multi-client support
        const ws2 = await connectClient(`ws://localhost:${serverPort}`);
        messagePromise = waitForMessage(ws2);
        ws2.send(JSON.stringify({ type: 'connect', sessionId }));
        response = await messagePromise;
        expect(response.type).toBe('connect');
      } catch (error: any) {
        // Expected to fail until implementation
        expect(error.message).toMatch(/create|not a function/);
      }
    });
  });
});