import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocketService } from '../WebSocketService.js';
import type { TerminalData, WebSocketMessage } from '@shelltender/core';

// Define WebSocket constants (these are standard values)
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = WS_CONNECTING;
  static OPEN = WS_OPEN;
  static CLOSING = WS_CLOSING;
  static CLOSED = WS_CLOSED;
  
  url: string;
  readyState: number = WS_CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
  }
  
  send = vi.fn();
  close = vi.fn();
  
  // Helper methods for testing
  simulateOpen() {
    this.readyState = WS_OPEN;
    if (this.onopen) this.onopen(new Event('open'));
  }
  
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  simulateClose() {
    this.readyState = WS_CLOSED;
    if (this.onclose) this.onclose(new CloseEvent('close'));
  }
  
  
  simulateError() {
    if (this.onerror) this.onerror(new Event('error'));
  }
}

// Replace global WebSocket with our mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWebSocket: MockWebSocket;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock console to avoid test output pollution
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    service = new WebSocketService();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    consoleErrorSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
  });

  describe('connect', () => {
    it('should create a WebSocket connection', () => {
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      
      expect(mockWebSocket).toBeDefined();
      expect(mockWebSocket.url).toBe(process.env.REACT_APP_WS_URL || 'ws://localhost:8081');
    });

    it('should handle relative URLs by constructing full WebSocket URL', () => {
      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = {
        protocol: 'http:',
        host: 'localhost:3000'
      };
      
      const service = new WebSocketService({ url: '/shelltender-ws' });
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      
      expect(mockWebSocket.url).toBe('ws://localhost:3000/shelltender-ws');
      
      // Test with HTTPS
      (window as any).location.protocol = 'https:';
      const httpsService = new WebSocketService({ url: '/ws-secure' });
      httpsService.connect();
      const httpsWs = (httpsService as any).ws as MockWebSocket;
      
      expect(httpsWs.url).toBe('wss://localhost:3000/ws-secure');
      
      // Restore location
      (window as any).location = originalLocation;
    });

    it('should use full URLs as-is', () => {
      const service = new WebSocketService({ url: 'ws://custom.example.com:9999/ws' });
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      
      expect(mockWebSocket.url).toBe('ws://custom.example.com:9999/ws');
    });

    it('should call onConnect handler when connected', () => {
      const onConnectHandler = vi.fn();
      service.onConnect(onConnectHandler);
      service.connect();
      
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      expect(onConnectHandler).toHaveBeenCalled();
    });

    it('should reset reconnect attempts on successful connection', () => {
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      
      // Simulate a failed connection and reconnect attempt
      (service as any).reconnectAttempts = 3;
      mockWebSocket.simulateOpen();
      
      expect((service as any).reconnectAttempts).toBe(0);
    });
  });

  describe('send', () => {
    it('should send data when connected', () => {
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      const data: WebSocketMessage = { type: 'input', data: 'test' };
      service.send(data);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(data));
    });

    it('should queue messages when not connected', () => {
      const data: TerminalData = { type: 'input', data: 'test' };
      service.send(data);
      
      expect((service as any).messageQueue).toHaveLength(1);
      expect((service as any).messageQueue[0]).toEqual(data);
    });

    it('should flush message queue when connected', () => {
      const data1: WebSocketMessage = { type: 'input', data: 'test1' };
      const data2: WebSocketMessage = { type: 'input', data: 'test2' };
      
      // Queue messages before connection
      service.send(data1);
      service.send(data2);
      
      // Connect and open
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      // Check that messages were sent
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(data1));
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(data2));
      expect((service as any).messageQueue).toHaveLength(0);
    });
  });

  describe('message handling', () => {

    it('should handle JSON parse errors gracefully', () => {
      service.connect();
      
      mockWebSocket = (service as any).ws as MockWebSocket;
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error));
    });

    it('should support event emitter pattern with on/off', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      service.on('pattern-match', handler1);
      service.on('pattern-match', handler2);
      service.connect();
      
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      const data: WebSocketMessage = { 
        type: 'pattern-match', 
        sessionId: 'session-1',
        patternId: 'pattern-123',
        patternName: 'test',
        timestamp: Date.now(),
        match: 'test match',
        position: 0
      };
      mockWebSocket.simulateMessage(data);
      
      expect(handler1).toHaveBeenCalledWith(data);
      expect(handler2).toHaveBeenCalledWith(data);
      
      // Remove one handler
      service.off('pattern-match', handler1);
      mockWebSocket.simulateMessage(data);
      
      expect(handler1).toHaveBeenCalledTimes(1); // Not called again
      expect(handler2).toHaveBeenCalledTimes(2); // Called again
    });

    it('should handle multiple message types', () => {
      const patternHandler = vi.fn();
      const eventHandler = vi.fn();
      const terminalHandler = vi.fn();
      
      service.on('pattern-registered', patternHandler);
      service.on('terminal-event', eventHandler);
      service.on('terminal-data', terminalHandler);
      service.connect();
      
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      const patternMsg: WebSocketMessage = { 
        type: 'pattern-registered',
        patternId: 'pattern-123',
        requestId: 'req-123'
      };
      
      const eventMsg: WebSocketMessage = {
        type: 'terminal-event',
        event: {
          type: 'pattern-match',
          sessionId: 'session-1',
          patternId: 'pattern-123',
          patternName: 'test',
          timestamp: Date.now(),
          match: 'test',
          position: 0
        }
      };
      
      const terminalMsg: WebSocketMessage = {
        type: 'terminal-data',
        data: 'Hello'
      };
      
      mockWebSocket.simulateMessage(patternMsg);
      mockWebSocket.simulateMessage(eventMsg);
      mockWebSocket.simulateMessage(terminalMsg);
      
      expect(patternHandler).toHaveBeenCalledWith(patternMsg);
      expect(eventHandler).toHaveBeenCalledWith(eventMsg);
      expect(terminalHandler).toHaveBeenCalledWith(terminalMsg);
    });
  });

  describe('reconnection', () => {
    it('should attempt to reconnect when connection closes', () => {
      const connectSpy = vi.spyOn(service, 'connect');
      service.connect();
      
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateClose();
      
      // Fast forward timer
      vi.advanceTimersByTime(1000);
      
      expect(connectSpy).toHaveBeenCalledTimes(2); // Initial + reconnect
    });

    it('should use exponential backoff for reconnection', () => {
      const connectSpy = vi.spyOn(service, 'connect');
      service.connect();
      
      mockWebSocket = (service as any).ws as MockWebSocket;
      
      // First reconnect - 1 second
      mockWebSocket.simulateClose();
      vi.advanceTimersByTime(1000);
      expect(connectSpy).toHaveBeenCalledTimes(2);
      
      // Second reconnect - 2 seconds
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateClose();
      vi.advanceTimersByTime(2000);
      expect(connectSpy).toHaveBeenCalledTimes(3);
      
      // Third reconnect - 4 seconds
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateClose();
      vi.advanceTimersByTime(4000);
      expect(connectSpy).toHaveBeenCalledTimes(4);
    });

    it('should stop reconnecting after max attempts', () => {
      const connectSpy = vi.spyOn(service, 'connect');
      service.connect();
      
      // Initial connection
      mockWebSocket = (service as any).ws as MockWebSocket;
      expect(connectSpy).toHaveBeenCalledTimes(1);
      
      // The reconnect logic: when reconnectAttempts < maxReconnectAttempts (5)
      // Close 1: attempts=0, 0<5 ✓ increments to 1, schedules reconnect
      // Close 2: attempts=1, 1<5 ✓ increments to 2, schedules reconnect  
      // Close 3: attempts=2, 2<5 ✓ increments to 3, schedules reconnect
      // Close 4: attempts=3, 3<5 ✓ increments to 4, schedules reconnect
      // Close 5: attempts=4, 4<5 ✓ increments to 5, schedules reconnect
      // Close 6: attempts=5, 5<5 ✗ does NOT schedule reconnect
      
      // Simulate 5 failures that will trigger reconnects
      for (let i = 0; i < 5; i++) {
        mockWebSocket.simulateClose();
        vi.advanceTimersByTime(20000); // Advance plenty to trigger any scheduled reconnect
        
        // Get new WebSocket instance if one was created
        if ((service as any).ws) {
          mockWebSocket = (service as any).ws as MockWebSocket;
        }
      }
      
      // Now we've had 1 initial + 5 reconnects = 6 total connections
      expect(connectSpy).toHaveBeenCalledTimes(6);
      expect((service as any).reconnectAttempts).toBe(5);
      
      // Try another close - should still not reconnect
      if ((service as any).ws) {
        mockWebSocket = (service as any).ws as MockWebSocket;
        mockWebSocket.simulateClose();
        vi.advanceTimersByTime(10000);
      }
      
      // Still should be 6
      expect(connectSpy).toHaveBeenCalledTimes(6);
    });
  });

  describe('disconnect', () => {
    it('should close connection and cleanup', () => {
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      service.disconnect();
      
      expect(mockWebSocket.close).toHaveBeenCalled();
      expect((service as any).ws).toBeNull();
    });

    it('should call onDisconnect handler', () => {
      const onDisconnectHandler = vi.fn();
      service.onDisconnect(onDisconnectHandler);
      service.connect();
      
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose();
      
      expect(onDisconnectHandler).toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      expect(service.isConnected()).toBe(true);
    });

    it('should return false when connection closed', () => {
      service.connect();
      mockWebSocket = (service as any).ws as MockWebSocket;
      mockWebSocket.simulateOpen();
      
      // Verify connected first
      expect(service.isConnected()).toBe(true);
      
      // Simulate close - this changes readyState
      mockWebSocket.simulateClose();
      
      // The WebSocket object still exists but readyState is CLOSED
      expect(mockWebSocket.readyState).toBe(MockWebSocket.CLOSED);
      expect(service.isConnected()).toBe(false);
    });
  });
});