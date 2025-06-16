import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventManager } from '../../src/events/EventManager';
import { PatternConfig, PatternMatchEvent, AnsiSequenceEvent } from '@shelltender/core';
import * as fs from 'fs/promises';

// Mock fs/promises to prevent actual file operations
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
}));

describe('EventManager', () => {
  let eventManager: EventManager;
  let emittedEvents: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    emittedEvents = [];
    eventManager = new EventManager();
    
    // Capture emitted events
    eventManager.on('terminal-event', (event) => {
      emittedEvents.push(event);
    });
  });

  afterEach(() => {
    eventManager.removeAllListeners();
  });

  describe('pattern registration', () => {
    it('should register a regex pattern', async () => {
      const config: PatternConfig = {
        name: 'error-pattern',
        type: 'regex',
        pattern: /Error:/,
      };

      const patternId = await eventManager.registerPattern('session-1', config);
      
      expect(patternId).toMatch(/^pattern-\d+-\d+$/);
      expect(eventManager.getSessionPatterns('session-1')).toHaveLength(1);
      expect(eventManager.getSessionPatterns('session-1')[0].name).toBe('error-pattern');
    });

    it('should register multiple patterns for a session', async () => {
      const patterns: PatternConfig[] = [
        { name: 'error', type: 'regex', pattern: /error/i },
        { name: 'warning', type: 'string', pattern: 'WARNING' },
        { name: 'ansi', type: 'ansi', pattern: 'color' },
      ];

      for (const config of patterns) {
        await eventManager.registerPattern('session-1', config);
      }

      const sessionPatterns = eventManager.getSessionPatterns('session-1');
      expect(sessionPatterns).toHaveLength(3);
      expect(sessionPatterns.map(p => p.name)).toEqual(['error', 'warning', 'ansi']);
    });

    it('should validate pattern configuration', async () => {
      const invalidConfig: PatternConfig = {
        name: 'invalid',
        type: 'regex',
        pattern: '[unclosed', // Invalid regex
      };

      await expect(eventManager.registerPattern('session-1', invalidConfig))
        .rejects.toThrow('Invalid pattern configuration');
    });

    it('should emit pattern-registered event', async () => {
      const registeredEvents: any[] = [];
      eventManager.on('pattern-registered', (event) => {
        registeredEvents.push(event);
      });

      const config: PatternConfig = {
        name: 'test',
        type: 'string',
        pattern: 'test',
      };

      const patternId = await eventManager.registerPattern('session-1', config);

      expect(registeredEvents).toHaveLength(1);
      expect(registeredEvents[0]).toEqual({
        patternId,
        sessionId: 'session-1',
        config,
      });
    });
  });

  describe('pattern unregistration', () => {
    it('should unregister a pattern', async () => {
      const config: PatternConfig = {
        name: 'test',
        type: 'string',
        pattern: 'test',
      };

      const patternId = await eventManager.registerPattern('session-1', config);
      expect(eventManager.getSessionPatterns('session-1')).toHaveLength(1);

      await eventManager.unregisterPattern(patternId);
      expect(eventManager.getSessionPatterns('session-1')).toHaveLength(0);
    });

    it('should throw error for non-existent pattern', async () => {
      await expect(eventManager.unregisterPattern('non-existent'))
        .rejects.toThrow('Pattern non-existent not found');
    });

    it('should emit pattern-unregistered event', async () => {
      const unregisteredEvents: any[] = [];
      eventManager.on('pattern-unregistered', (event) => {
        unregisteredEvents.push(event);
      });

      const config: PatternConfig = {
        name: 'test',
        type: 'string',
        pattern: 'test',
      };

      const patternId = await eventManager.registerPattern('session-1', config);
      await eventManager.unregisterPattern(patternId);

      expect(unregisteredEvents).toHaveLength(1);
      expect(unregisteredEvents[0]).toEqual({ patternId });
    });
  });

  describe('pattern matching', () => {
    it('should match registered patterns', async () => {
      const config: PatternConfig = {
        name: 'error-detector',
        type: 'regex',
        pattern: /Error: (.+)/,
      };

      const patternId = await eventManager.registerPattern('session-1', config);
      
      eventManager.processData('session-1', 'Error: File not found', 'Error: File not found');

      expect(emittedEvents).toHaveLength(1);
      const event = emittedEvents[0] as PatternMatchEvent;
      expect(event.type).toBe('pattern-match');
      expect(event.sessionId).toBe('session-1');
      expect(event.patternId).toBe(patternId);
      expect(event.patternName).toBe('error-detector');
      expect(event.match).toBe('Error: File not found');
      expect(event.groups).toEqual({ '1': 'File not found' });
    });

    it('should match multiple patterns in same data', async () => {
      await eventManager.registerPattern('session-1', {
        name: 'error',
        type: 'string',
        pattern: 'Error',
      });

      await eventManager.registerPattern('session-1', {
        name: 'warning',
        type: 'string',
        pattern: 'Warning',
      });

      eventManager.processData('session-1', 'Error: Warning: Multiple issues', '');

      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents.map(e => e.patternName).sort()).toEqual(['error', 'warning']);
    });

    it('should not match patterns from other sessions', async () => {
      await eventManager.registerPattern('session-1', {
        name: 'test',
        type: 'string',
        pattern: 'test',
      });

      eventManager.processData('session-2', 'test data', '');

      expect(emittedEvents).toHaveLength(0);
    });

    it('should handle pattern matching errors gracefully', async () => {
      // Create a custom matcher that only throws during actual matching, not validation
      const errorFn = vi.fn((data: string) => {
        if (data !== '') {
          throw new Error('Match error');
        }
        return null;
      });

      await eventManager.registerPattern('session-1', {
        name: 'error-matcher',
        type: 'custom',
        pattern: errorFn,
      });

      // Should not throw
      expect(() => {
        eventManager.processData('session-1', 'test', '');
      }).not.toThrow();

      // Should handle the error and not emit any events
      expect(emittedEvents).toHaveLength(0);
    });
  });

  describe('ANSI sequence detection', () => {
    it('should detect ANSI color sequences', () => {
      eventManager.processData('session-1', '\x1b[31mRed text\x1b[0m', '');

      // Should emit 2 ANSI events (color and reset)
      const ansiEvents = emittedEvents.filter(e => e.type === 'ansi-sequence');
      expect(ansiEvents).toHaveLength(2);

      const colorEvent = ansiEvents[0] as AnsiSequenceEvent;
      expect(colorEvent.sequence).toBe('\x1b[31m');
      expect(colorEvent.category).toBe('color');
      expect(colorEvent.parsed).toEqual({
        command: 'm',
        params: [31],
      });

      const resetEvent = ansiEvents[1] as AnsiSequenceEvent;
      expect(resetEvent.sequence).toBe('\x1b[0m');
      expect(resetEvent.category).toBe('color');
    });

    it('should detect cursor movement sequences', () => {
      eventManager.processData('session-1', '\x1b[2A\x1b[3B', '');

      const ansiEvents = emittedEvents.filter(e => e.type === 'ansi-sequence');
      expect(ansiEvents).toHaveLength(2);
      expect(ansiEvents.every(e => e.category === 'cursor')).toBe(true);
    });

    it('should detect clear sequences', () => {
      eventManager.processData('session-1', '\x1b[2J\x1b[K', '');

      const ansiEvents = emittedEvents.filter(e => e.type === 'ansi-sequence');
      expect(ansiEvents).toHaveLength(2);
      expect(ansiEvents.every(e => e.category === 'clear')).toBe(true);
    });
  });

  describe('session cleanup', () => {
    it('should remove all patterns for a session', async () => {
      // Register multiple patterns
      await eventManager.registerPattern('session-1', {
        name: 'pattern1',
        type: 'string',
        pattern: 'test1',
      });

      await eventManager.registerPattern('session-1', {
        name: 'pattern2',
        type: 'string',
        pattern: 'test2',
      });

      expect(eventManager.getSessionPatterns('session-1')).toHaveLength(2);

      await eventManager.cleanupSession('session-1');

      expect(eventManager.getSessionPatterns('session-1')).toHaveLength(0);
    });

    it('should handle cleanup of non-existent session', async () => {
      // Should not throw
      await expect(eventManager.cleanupSession('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should provide pattern statistics', async () => {
      await eventManager.registerPattern('session-1', {
        name: 'test',
        type: 'string',
        pattern: 'match',
      });

      // Trigger some matches
      eventManager.processData('session-1', 'match this', '');
      eventManager.processData('session-1', 'match that', '');

      const stats = eventManager.getStats();
      expect(stats.totalPatterns).toBe(1);
      expect(stats.sessionCount).toBe(1);
      expect(stats.patterns).toHaveLength(1);
      expect(stats.patterns[0].matchCount).toBe(2);
    });
  });

  describe('pattern persistence', () => {
    it('should persist patterns when configured', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      const persistManager = new EventManager({ persistPath: '/tmp/test' });

      await persistManager.registerPattern('session-1', {
        name: 'persistent',
        type: 'string',
        pattern: 'test',
        options: { persist: true },
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [filePath, data] = mockWriteFile.mock.calls[0];
      expect(filePath).toBe('/tmp/test/patterns.json');
      
      const saved = JSON.parse(data as string);
      expect(saved).toHaveLength(1);
      expect(saved[0].config.name).toBe('persistent');
    });

    it('should not persist custom matchers', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      const persistManager = new EventManager({ persistPath: '/tmp/test' });

      await persistManager.registerPattern('session-1', {
        name: 'custom',
        type: 'custom',
        pattern: () => null,
        options: { persist: true },
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [, data] = mockWriteFile.mock.calls[0];
      const saved = JSON.parse(data as string);
      expect(saved).toHaveLength(0); // Custom matcher not persisted
    });

    it('should load persisted patterns on startup', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockResolvedValueOnce(JSON.stringify([
        {
          id: 'pattern-1-12345',
          sessionId: 'session-1',
          config: {
            name: 'loaded',
            type: 'string',
            pattern: 'test',
            options: { persist: true },
          },
        },
      ]));

      // Create new manager and wait for async load
      const loadManager = new EventManager({ persistPath: '/tmp/test' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const patterns = loadManager.getSessionPatterns('session-1');
      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe('loaded');
    });
  });

  describe('debouncing', () => {
    it('should respect pattern debounce settings', async () => {
      await eventManager.registerPattern('session-1', {
        name: 'debounced',
        type: 'string',
        pattern: 'test',
        options: { debounce: 50 },
      });

      // First match should work
      eventManager.processData('session-1', 'test 1', '');
      expect(emittedEvents).toHaveLength(1);

      // Immediate second match should be debounced
      eventManager.processData('session-1', 'test 2', '');
      expect(emittedEvents).toHaveLength(1);

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 60));

      // Now it should match again
      eventManager.processData('session-1', 'test 3', '');
      expect(emittedEvents).toHaveLength(2);
    });
  });
});