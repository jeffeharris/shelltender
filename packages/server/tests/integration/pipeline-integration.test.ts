import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalDataPipeline, CommonProcessors } from '../../src/TerminalDataPipeline.js';
import { PipelineIntegration } from '../../src/integration/PipelineIntegration.js';
import { SessionManager } from '../../src/SessionManager.js';
import { BufferManager } from '../../src/BufferManager.js';
import { SessionStore } from '../../src/SessionStore.js';
import { WebSocketServer } from '../../src/WebSocketServer.js';
import { EventManager } from '../../src/events/EventManager.js';

// Mock node-pty
vi.mock('node-pty', () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  }))
}));

// Mock WebSocket Server
vi.mock('ws', () => ({
  WebSocketServer: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn()
  }))
}));

// Mock SessionStore
vi.mock('../../src/SessionStore.js', () => ({
  SessionStore: vi.fn(() => ({
    loadAllSessions: vi.fn().mockResolvedValue(new Map()),
    saveSession: vi.fn(),
    deleteSession: vi.fn(),
    updateSessionBuffer: vi.fn()
  }))
}));

describe('PipelineIntegration', () => {
  let pipeline: TerminalDataPipeline;
  let sessionManager: SessionManager;
  let bufferManager: BufferManager;
  let wsServer: WebSocketServer;
  let sessionStore: SessionStore;
  let eventManager: EventManager;
  let integration: PipelineIntegration;

  beforeEach(async () => {
    // Create components
    pipeline = new TerminalDataPipeline();
    sessionStore = new SessionStore();
    sessionManager = new SessionManager(sessionStore);
    bufferManager = new BufferManager();
    wsServer = new WebSocketServer(8080, sessionManager, bufferManager);
    eventManager = new EventManager();

    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    // Create integration
    integration = new PipelineIntegration(
      pipeline,
      sessionManager,
      bufferManager,
      wsServer,
      sessionStore,
      eventManager
    );
  });

  afterEach(() => {
    if (integration) {
      integration.teardown();
    }
  });

  describe('setup', () => {
    it('should connect components properly', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      integration.setup();
      
      expect(consoleSpy).toHaveBeenCalledWith('Pipeline integration setup complete');
      consoleSpy.mockRestore();
    });

    it('should process data through pipeline when session emits data', async () => {
      integration.setup();
      
      // Add a processor to verify data flows through
      const processedData: any[] = [];
      pipeline.addProcessor('test', event => {
        processedData.push(event.data);
        return event;
      });

      // Simulate session emitting data
      sessionManager.emit('data', 'session-1', 'test data', { source: 'pty' });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(processedData).toContain('test data');
    });

    it('should update buffer with processed data', async () => {
      integration.setup();
      
      // Spy on buffer manager
      const addToBufferSpy = vi.spyOn(bufferManager, 'addToBuffer');
      
      // Add a processor that modifies data
      pipeline.addProcessor('uppercase', event => ({
        ...event,
        data: event.data.toUpperCase()
      }));

      // Simulate data flow
      sessionManager.emit('data', 'session-1', 'hello world', { source: 'pty' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(addToBufferSpy).toHaveBeenCalledWith('session-1', 'HELLO WORLD');
    });

    it('should broadcast to WebSocket clients', async () => {
      integration.setup();
      
      // Spy on WebSocket broadcast
      const broadcastSpy = vi.spyOn(wsServer, 'broadcastToSession');
      
      // Simulate data flow
      sessionManager.emit('data', 'session-1', 'test output', { source: 'pty' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(broadcastSpy).toHaveBeenCalledWith('session-1', {
        type: 'output',
        sessionId: 'session-1',
        data: 'test output'
      });
    });

    it('should process data through EventManager if available', async () => {
      integration.setup();
      
      // Spy on event manager
      const processDataSpy = vi.spyOn(eventManager, 'processData');
      
      // Simulate data flow
      sessionManager.emit('data', 'session-1', 'event data', { source: 'pty' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(processDataSpy).toHaveBeenCalledWith('session-1', 'event data', 'event data');
    });
  });

  describe('session end handling', () => {
    it('should save buffer and clear on session end', async () => {
      integration.setup();
      
      // Spy on store and buffer manager
      const updateBufferSpy = vi.spyOn(sessionStore, 'updateSessionBuffer');
      const clearBufferSpy = vi.spyOn(bufferManager, 'clearBuffer');
      
      // Trigger data flow to create a save timer
      sessionManager.emit('data', 'session-1', 'some data');
      
      // Wait a bit then emit session end
      await new Promise(resolve => setTimeout(resolve, 10));
      sessionManager.emit('sessionEnd', 'session-1');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(updateBufferSpy).toHaveBeenCalledWith('session-1', 'some data');
      expect(clearBufferSpy).toHaveBeenCalledWith('session-1');
    });

    it('should debounce saves during active sessions', async () => {
      integration.setup();
      
      const updateBufferSpy = vi.spyOn(sessionStore, 'updateSessionBuffer');
      
      // Emit multiple data events quickly
      sessionManager.emit('data', 'session-1', 'data1');
      sessionManager.emit('data', 'session-1', 'data2');
      sessionManager.emit('data', 'session-1', 'data3');
      
      // Should not save immediately
      expect(updateBufferSpy).not.toHaveBeenCalled();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should save once after timeout
      expect(updateBufferSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('audit logging', () => {
    it('should enable audit logging when option is set', async () => {
      const auditPipeline = new TerminalDataPipeline({ enableAudit: true });
      const auditIntegration = new PipelineIntegration(
        auditPipeline,
        sessionManager,
        bufferManager,
        wsServer,
        sessionStore
      );
      
      const consoleSpy = vi.spyOn(console, 'log');
      
      auditIntegration.setup();
      
      // Simulate data
      sessionManager.emit('data', 'session-1', 'audit test data');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('session-1')
      );
      
      consoleSpy.mockRestore();
      auditIntegration.teardown();
    });
  });

  describe('teardown', () => {
    it('should clean up all subscriptions', () => {
      integration.setup();
      
      // Add some timers
      sessionManager.emit('data', 'session-1', 'data');
      
      // Spy on pipeline removeAllListeners
      const removeListenersSpy = vi.spyOn(pipeline, 'removeAllListeners');
      
      integration.teardown();
      
      expect(removeListenersSpy).toHaveBeenCalledWith('data:raw');
      expect(removeListenersSpy).toHaveBeenCalledWith('data:processed');
    });
  });

  describe('real-world scenario', () => {
    it('should handle security filtering in pipeline', async () => {
      // Add security processor
      pipeline.addProcessor('security', CommonProcessors.securityFilter([
        /password:\s*\w+/gi
      ]), 10);
      
      integration.setup();
      
      const addToBufferSpy = vi.spyOn(bufferManager, 'addToBuffer');
      const broadcastSpy = vi.spyOn(wsServer, 'broadcastToSession');
      
      // Emit sensitive data
      sessionManager.emit('data', 'session-1', 'password: secret123', { source: 'pty' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Both buffer and broadcast should receive redacted data
      expect(addToBufferSpy).toHaveBeenCalledWith('session-1', '[REDACTED]');
      expect(broadcastSpy).toHaveBeenCalledWith('session-1', expect.objectContaining({
        data: '[REDACTED]'
      }));
    });
  });
});