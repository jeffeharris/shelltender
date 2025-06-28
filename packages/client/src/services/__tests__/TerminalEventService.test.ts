import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TerminalEventService } from '../TerminalEventService.js';
import type { WebSocketService } from '../WebSocketService';
import type { PatternMatchEvent } from '@shelltender/core';

describe('TerminalEventService', () => {
  let mockWs: any;
  let service: TerminalEventService;
  let messageHandlers: Map<string, ((data: any) => void)[]>;

  beforeEach(() => {
    messageHandlers = new Map();
    
    mockWs = {
      send: vi.fn(),
      on: vi.fn((type: string, handler: (data: any) => void) => {
        if (!messageHandlers.has(type)) {
          messageHandlers.set(type, []);
        }
        messageHandlers.get(type)!.push(handler);
      }),
      off: vi.fn((type: string, handler: (data: any) => void) => {
        const handlers = messageHandlers.get(type);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index !== -1) {
            handlers.splice(index, 1);
          }
        }
      })
    };
    
    service = new TerminalEventService(mockWs as unknown as WebSocketService);
  });

  describe('registerPattern', () => {
    it('should send register pattern message and return patternId', async () => {
      const config = {
        name: 'test-pattern',
        type: 'regex' as const,
        pattern: /test/
      };

      // Simulate successful response
      setTimeout(() => {
        const handlers = messageHandlers.get('pattern-registered');
        if (handlers && handlers.length > 0) {
          handlers[0]({ 
            patternId: 'pattern-123', 
            requestId: mockWs.send.mock.calls[0][0].requestId,
            sessionId: 'session-1'
          });
        }
      }, 10);

      const patternId = await service.registerPattern('session-1', config);

      expect(mockWs.send).toHaveBeenCalledWith({
        type: 'register-pattern',
        sessionId: 'session-1',
        config,
        requestId: expect.stringMatching(/^req-\d+-[a-z0-9]+$/)
      });
      expect(patternId).toBe('pattern-123');
    });

    it('should reject on timeout', async () => {
      const config = {
        name: 'test-pattern',
        type: 'regex' as const,
        pattern: /test/
      };

      await expect(
        service.registerPattern('session-1', config)
      ).rejects.toThrow('Pattern registration timeout');
    }, 15000);

    it('should handle error response', async () => {
      const config = {
        name: 'test-pattern',
        type: 'regex' as const,
        pattern: /test/
      };

      setTimeout(() => {
        const handlers = messageHandlers.get('error');
        if (handlers && handlers.length > 0) {
          handlers[0]({ 
            requestId: mockWs.send.mock.calls[0][0].requestId,
            data: 'Invalid pattern'
          });
        }
      }, 10);

      await expect(
        service.registerPattern('session-1', config)
      ).rejects.toThrow('Invalid pattern');
    });
  });

  describe('unregisterPattern', () => {
    it('should send unregister pattern message', async () => {
      setTimeout(() => {
        const handlers = messageHandlers.get('pattern-unregistered');
        if (handlers && handlers.length > 0) {
          handlers[0]({ 
            patternId: 'pattern-123',
            requestId: mockWs.send.mock.calls[0][0].requestId
          });
        }
      }, 10);

      await service.unregisterPattern('pattern-123');

      expect(mockWs.send).toHaveBeenCalledWith({
        type: 'unregister-pattern',
        patternId: 'pattern-123',
        requestId: expect.stringMatching(/^req-\d+-[a-z0-9]+$/)
      });
    });
  });

  describe('subscribe', () => {
    it('should subscribe to event types and return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe(['pattern-match', 'ansi-sequence'], callback);

      expect(mockWs.send).toHaveBeenCalledWith({
        type: 'subscribe-events',
        eventTypes: ['pattern-match', 'ansi-sequence']
      });

      // Test event handling
      const mockEvent: PatternMatchEvent = {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: 'pattern-123',
        patternName: 'test-pattern',
        timestamp: Date.now(),
        match: 'test match',
        position: 0
      };

      const handlers = messageHandlers.get('terminal-event');
      if (handlers && handlers.length > 0) {
        handlers[0]({ event: mockEvent });
      }

      expect(callback).toHaveBeenCalledWith(mockEvent);

      // Test unsubscribe
      unsubscribe();
      
      expect(mockWs.send).toHaveBeenCalledWith({
        type: 'unsubscribe-events',
        eventTypes: ['pattern-match', 'ansi-sequence']
      });
    });

    it('should handle multiple callbacks for same event type', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.subscribe(['pattern-match'], callback1);
      service.subscribe(['pattern-match'], callback2);

      const mockEvent: PatternMatchEvent = {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: 'pattern-123',
        patternName: 'test-pattern',
        timestamp: Date.now(),
        match: 'test match',
        position: 0
      };

      const handlers = messageHandlers.get('terminal-event');
      if (handlers && handlers.length > 0) {
        handlers[0]({ event: mockEvent });
      }

      expect(callback1).toHaveBeenCalledWith(mockEvent);
      expect(callback2).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('subscribeToSession', () => {
    it('should only receive events for specific session', () => {
      const callback = vi.fn();
      service.subscribeToSession('session-1', callback);

      const event1: PatternMatchEvent = {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: 'pattern-123',
        patternName: 'test-pattern',
        timestamp: Date.now(),
        match: 'test match',
        position: 0
      };

      const event2: PatternMatchEvent = {
        type: 'pattern-match',
        sessionId: 'session-2',
        patternId: 'pattern-456',
        patternName: 'test-pattern',
        timestamp: Date.now(),
        match: 'test match',
        position: 0
      };

      const handlers = messageHandlers.get('terminal-event');
      if (handlers && handlers.length > 0) {
        handlers[0]({ event: event1 });
        handlers[0]({ event: event2 });
      }

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(event1);
    });
  });

  describe('getPatternsForSession', () => {
    it('should track and return patterns for a session', async () => {
      // Register two patterns
      setTimeout(() => {
        const handlers = messageHandlers.get('pattern-registered');
        if (handlers && handlers.length > 0) {
          handlers[0]({ 
            patternId: 'pattern-1', 
            requestId: mockWs.send.mock.calls[0][0].requestId,
            sessionId: 'session-1'
          });
        }
      }, 10);

      await service.registerPattern('session-1', {
        name: 'pattern-1',
        type: 'regex',
        pattern: /test1/
      });

      setTimeout(() => {
        const handlers = messageHandlers.get('pattern-registered');
        if (handlers && handlers.length > 0) {
          handlers[0]({ 
            patternId: 'pattern-2', 
            requestId: mockWs.send.mock.calls[1][0].requestId,
            sessionId: 'session-1'
          });
        }
      }, 10);

      await service.registerPattern('session-1', {
        name: 'pattern-2',
        type: 'regex',
        pattern: /test2/
      });

      const patterns = service.getPatternsForSession('session-1');
      expect(patterns).toEqual(['pattern-1', 'pattern-2']);
    });
  });

  describe('getPatterns', () => {
    it('should fetch patterns from server', async () => {
      const mockPatterns = [
        { patternId: 'pattern-1', config: { name: 'test-1', type: 'regex', pattern: /test/ }, sessionId: 'session-1' },
        { patternId: 'pattern-2', config: { name: 'test-2', type: 'string', pattern: 'error' }, sessionId: 'session-1' }
      ];

      setTimeout(() => {
        const handlers = messageHandlers.get('patterns-list');
        if (handlers && handlers.length > 0) {
          handlers[0]({ 
            patterns: mockPatterns,
            requestId: mockWs.send.mock.calls[0][0].requestId
          });
        }
      }, 10);

      const patterns = await service.getPatterns('session-1');

      expect(mockWs.send).toHaveBeenCalledWith({
        type: 'get-patterns',
        sessionId: 'session-1',
        requestId: expect.stringMatching(/^req-\d+-[a-z0-9]+$/)
      });
      expect(patterns).toEqual(mockPatterns);
    });

    it('should handle timeout for getPatterns', async () => {
      await expect(
        service.getPatterns('session-1')
      ).rejects.toThrow('Get patterns timeout');
    }, 15000);
  });

  describe('validatePattern', () => {
    it('should validate regex patterns', async () => {
      // Valid regex
      const validConfig = {
        name: 'test-pattern',
        type: 'regex' as const,
        pattern: 'test.*pattern'
      };

      setTimeout(() => {
        const handlers = messageHandlers.get('pattern-registered');
        if (handlers && handlers.length > 0) {
          handlers[0]({ 
            patternId: 'pattern-123', 
            requestId: mockWs.send.mock.calls[0][0].requestId,
            sessionId: 'session-1'
          });
        }
      }, 10);

      await expect(service.registerPattern('session-1', validConfig)).resolves.toBe('pattern-123');

      // Invalid regex
      const invalidConfig = {
        name: 'test-pattern',
        type: 'regex' as const,
        pattern: '[unclosed'
      };

      await expect(service.registerPattern('session-1', invalidConfig)).rejects.toThrow('Invalid regex pattern');
    });

    it('should validate string patterns', async () => {
      const invalidConfig = {
        name: 'test-pattern',
        type: 'string' as const,
        pattern: 123 as any // Invalid: should be string
      };

      await expect(service.registerPattern('session-1', invalidConfig)).rejects.toThrow('String pattern must be a string');
    });

    it('should require name and type', async () => {
      const invalidConfig1 = {
        type: 'regex' as const,
        pattern: /test/
      } as any;

      await expect(service.registerPattern('session-1', invalidConfig1)).rejects.toThrow('Pattern must have name and type');

      const invalidConfig2 = {
        name: 'test',
        pattern: /test/
      } as any;

      await expect(service.registerPattern('session-1', invalidConfig2)).rejects.toThrow('Pattern must have name and type');
    });
  });
});