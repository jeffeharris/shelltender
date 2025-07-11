import { describe, it, expect } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import { 
  SessionManager, 
  BufferManager, 
  SessionStore, 
  WebSocketServer,
  EventManager,
  TerminalDataPipeline,
  PipelineIntegration
} from '../index.js';

describe('Backwards Compatibility - Server', () => {
  it('should still support the original manual setup', async () => {
    // This is how v0.5.0 users currently set up Shelltender
    const app = express();
    const httpServer = createServer(app);
    
    // Initialize components manually
    const sessionStore = new SessionStore();
    await sessionStore.initialize();
    
    const bufferManager = new BufferManager();
    const eventManager = new EventManager();
    const sessionManager = new SessionManager(sessionStore);
    
    // Create WebSocket server (single-port mode)
    const wsServer = WebSocketServer.create(
      { server: httpServer, path: '/ws' },
      sessionManager,
      bufferManager,
      eventManager
    );
    
    // Initialize pipeline
    const pipeline = new TerminalDataPipeline();
    
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
    
    // Verify everything is set up correctly
    expect(sessionManager).toBeInstanceOf(SessionManager);
    expect(wsServer).toBeInstanceOf(WebSocketServer);
    expect(integration).toBeInstanceOf(PipelineIntegration);
    
    // Should be able to create sessions
    const session = await sessionManager.createSession({
      id: 'test-session',
      cols: 80,
      rows: 24
    });
    
    expect(session.id).toBe('test-session');
    
    // Cleanup
    sessionManager.killSession('test-session');
    httpServer.close();
  });

  it('should support dual-port mode setup', async () => {
    const app = express();
    
    // Original dual-port setup
    const sessionStore = new SessionStore();
    await sessionStore.initialize();
    
    const bufferManager = new BufferManager();
    const eventManager = new EventManager();
    const sessionManager = new SessionManager(sessionStore);
    
    // Create standalone WebSocket server on different port
    const wsServer = WebSocketServer.create(
      8081,
      sessionManager,
      bufferManager,
      eventManager
    );
    
    expect(wsServer).toBeInstanceOf(WebSocketServer);
    
    // Cleanup
    if (wsServer.wss) {
      wsServer.wss.close();
    }
  });

  it('should maintain all existing exports', () => {
    // Verify all v0.5.0 exports still exist
    const exports = [
      'SessionManager',
      'BufferManager',
      'SessionStore', 
      'WebSocketServer',
      'EventManager',
      'TerminalDataPipeline',
      'PipelineIntegration',
      'CommonProcessors',
      'CommonFilters',
      'RestrictedShell'
    ];
    
    const serverModule = require('../index.js');
    
    for (const exportName of exports) {
      expect(serverModule[exportName]).toBeDefined();
      expect(typeof serverModule[exportName]).toBe('function');
    }
  });

  it('should support existing SessionManager API', async () => {
    const sessionStore = new SessionStore();
    await sessionStore.initialize();
    const sessionManager = new SessionManager(sessionStore);
    
    // All existing methods should work
    expect(typeof sessionManager.createSession).toBe('function');
    expect(typeof sessionManager.getSession).toBe('function');
    expect(typeof sessionManager.getAllSessions).toBe('function');
    expect(typeof sessionManager.killSession).toBe('function');
    expect(typeof sessionManager.resizeSession).toBe('function');
    expect(typeof sessionManager.sendToSession).toBe('function');
    
    // Event emitter methods
    expect(typeof sessionManager.on).toBe('function');
    expect(typeof sessionManager.onData).toBe('function');
    expect(typeof sessionManager.onSessionEnd).toBe('function');
  });

  it('should support existing WebSocketServer.create signatures', () => {
    const mockSessionManager = {} as SessionManager;
    const mockBufferManager = {} as BufferManager;
    const mockEventManager = {} as EventManager;
    
    // Both signatures should work
    expect(() => {
      // Single port mode
      WebSocketServer.create(
        { server: {} as any, path: '/ws' },
        mockSessionManager,
        mockBufferManager,
        mockEventManager
      );
    }).not.toThrow();
    
    expect(() => {
      // Dual port mode  
      WebSocketServer.create(
        8081,
        mockSessionManager,
        mockBufferManager,
        mockEventManager
      );
    }).not.toThrow();
  });

  it('should support custom pipeline configuration', () => {
    const pipeline = new TerminalDataPipeline({
      enableAudit: true,
      enableMetrics: true
    });
    
    // Should support adding custom processors
    pipeline.addProcessor('custom', (data) => data.toUpperCase(), 10);
    
    // Should support adding custom filters
    pipeline.addFilter('custom', (data) => !data.includes('secret'));
    
    expect(pipeline.getProcessorNames()).toContain('custom');
    expect(pipeline.getFilterNames()).toContain('custom');
  });
});

describe('Backwards Compatibility - Client', () => {
  it('should maintain all existing exports', async () => {
    const exports = [
      'Terminal',
      'SessionTabs',
      'SessionManager',
      'WebSocketProvider',
      'useWebSocket',
      'useTerminal',
      'ToastProvider',
      'useToast'
    ];
    
    const clientModule = await import('@shelltender/client');
    
    for (const exportName of exports) {
      expect(clientModule[exportName]).toBeDefined();
    }
  });

  it('should support existing Terminal component props', () => {
    const { Terminal } = require('@shelltender/client');
    
    // Should accept all existing props
    const props = {
      sessionId: 'test',
      onSessionCreated: vi.fn(),
      onSessionEnded: vi.fn(),
      theme: {} as any,
      fontSize: 14,
      fontFamily: 'monospace',
      className: 'custom-terminal'
    };
    
    // Should not throw when creating element with these props
    expect(() => {
      const element = Terminal(props);
    }).not.toThrow();
  });

  it('should support existing WebSocketProvider usage', () => {
    const { WebSocketProvider } = require('@shelltender/client');
    
    // All existing config options should work
    const configs = [
      { url: '/ws' },
      { port: '8080' },
      { url: 'ws://localhost:8080/ws' },
      { 
        reconnectInterval: 1000,
        maxReconnectAttempts: 5,
        reconnectDecay: 1.5
      }
    ];
    
    for (const config of configs) {
      expect(() => {
        WebSocketProvider({ config, children: null });
      }).not.toThrow();
    }
  });

  it('should support existing hooks', () => {
    const { useWebSocket, useTerminal } = require('@shelltender/client');
    
    // Hooks should exist and be functions
    expect(typeof useWebSocket).toBe('function');
    expect(typeof useTerminal).toBe('function');
  });
});

describe('Migration Path', () => {
  it('should allow gradual migration from manual to convenience API', async () => {
    // Start with existing manual setup
    const app = express();
    const httpServer = createServer(app);
    
    const sessionStore = new SessionStore();
    await sessionStore.initialize();
    const sessionManager = new SessionManager(sessionStore);
    
    // Can mix old and new - use new createShelltender just for WebSocket setup
    const { createShelltender } = await import('../createServer.js');
    
    // This should detect existing sessionManager and reuse it
    const shelltender = await createShelltender(app, {
      server: httpServer,
      sessionManager, // Pass existing instance
      sessionStore   // Pass existing instance
    });
    
    // Should reuse the provided instances
    expect(shelltender.sessionManager).toBe(sessionManager);
    expect(shelltender.sessionStore).toBe(sessionStore);
    
    httpServer.close();
  });

  it('should provide migration warnings for deprecated patterns', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    
    // Using convenience API but then trying to manually set up pipeline
    const { createShelltender } = await import('../createServer.js');
    const app = express();
    const shelltender = await createShelltender(app);
    
    // This pattern is no longer needed with convenience API
    const pipeline = new TerminalDataPipeline();
    const integration = new PipelineIntegration(
      pipeline,
      shelltender.sessionManager,
      shelltender.bufferManager,
      shelltender.wsServer,
      shelltender.sessionStore,
      shelltender.eventManager
    );
    
    // Should warn about redundant setup
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Pipeline already configured by createShelltender')
    );
    
    consoleSpy.mockRestore();
  });
});