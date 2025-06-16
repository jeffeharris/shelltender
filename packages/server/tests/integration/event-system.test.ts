import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventManager } from '../../src/EventManager';
import { BufferManager } from '../../src/BufferManager';
import { SessionManager } from '../../src/SessionManager';
import { PatternConfig, AnyTerminalEvent } from '@shelltender/core';
import * as fixtures from '../fixtures/terminal-outputs';

// Mock node-pty
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

// Mock fs operations
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

describe('Event System Integration', () => {
  let eventManager: EventManager;
  let bufferManager: BufferManager;
  let sessionManager: SessionManager;
  let collectedEvents: AnyTerminalEvent[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    collectedEvents = [];
    
    eventManager = new EventManager();
    bufferManager = new BufferManager();
    
    // Enable event system in buffer manager
    bufferManager.enableEventSystem(eventManager);
    
    // Collect all events
    eventManager.on('terminal-event', (event) => {
      collectedEvents.push(event);
    });
    
    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(() => {
    eventManager.removeAllListeners();
  });

  describe('end-to-end pattern matching', () => {
    it('should detect patterns as data flows through buffer manager', async () => {
      const sessionId = 'test-session';
      
      // Register patterns
      await eventManager.registerPattern(sessionId, {
        name: 'error-detector',
        type: 'regex',
        pattern: /Error: (.+)/,
      });

      await eventManager.registerPattern(sessionId, {
        name: 'prompt-detector',
        type: 'regex',
        pattern: /\$\s*$/,
      });

      // Create buffer
      bufferManager.createBuffer(sessionId);

      // Simulate terminal output
      bufferManager.addData(sessionId, 'Building project...\n');
      bufferManager.addData(sessionId, fixtures.BUILD_ERROR);
      bufferManager.addData(sessionId, '\n');
      bufferManager.addData(sessionId, fixtures.BASH_PROMPT);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Should have matched error and prompt
      const patternEvents = collectedEvents.filter(e => e.type === 'pattern-match');
      expect(patternEvents).toHaveLength(2);

      const errorEvent = patternEvents.find(e => e.patternName === 'error-detector');
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.match).toBe('Error: Can\'t resolve \'./missing\'');

      const promptEvent = patternEvents.find(e => e.patternName === 'prompt-detector');
      expect(promptEvent).toBeDefined();
      expect(promptEvent!.match).toBe('$ ');
    });

    it('should detect ANSI sequences in mixed output', async () => {
      const sessionId = 'test-session';
      bufferManager.createBuffer(sessionId);

      // Add mixed output with ANSI
      bufferManager.addData(sessionId, fixtures.MIXED_OUTPUT);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Should detect ANSI sequences
      const ansiEvents = collectedEvents.filter(e => e.type === 'ansi-sequence');
      expect(ansiEvents.length).toBeGreaterThan(0);

      // Should have detected the green color sequence
      const colorEvent = ansiEvents.find(e => e.sequence === '\x1b[32m');
      expect(colorEvent).toBeDefined();
      expect(colorEvent!.category).toBe('color');
    });
  });

  describe('multiple session handling', () => {
    it('should isolate patterns between sessions', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      bufferManager.createBuffer(session1);
      bufferManager.createBuffer(session2);

      // Register different patterns for each session
      await eventManager.registerPattern(session1, {
        name: 'session1-pattern',
        type: 'string',
        pattern: 'SESSION1',
      });

      await eventManager.registerPattern(session2, {
        name: 'session2-pattern',
        type: 'string',
        pattern: 'SESSION2',
      });

      // Add data to both sessions
      bufferManager.addData(session1, 'This is SESSION1 data');
      bufferManager.addData(session2, 'This is SESSION2 data');

      // Wait for processing
      await new Promise(resolve => setImmediate(resolve));

      // Each session should only match its own pattern
      const session1Events = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.sessionId === session1
      );
      const session2Events = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.sessionId === session2
      );

      expect(session1Events).toHaveLength(1);
      expect(session1Events[0].patternName).toBe('session1-pattern');

      expect(session2Events).toHaveLength(1);
      expect(session2Events[0].patternName).toBe('session2-pattern');
    });
  });

  describe('complex pattern scenarios', () => {
    it('should handle build output with progress detection', async () => {
      const sessionId = 'build-session';
      bufferManager.createBuffer(sessionId);

      // Register build-related patterns
      await eventManager.registerPattern(sessionId, {
        name: 'build-progress',
        type: 'regex',
        pattern: /(\d+)%/,
      });

      await eventManager.registerPattern(sessionId, {
        name: 'build-complete',
        type: 'regex',
        pattern: /compiled successfully/i,
      });

      // Simulate build output
      bufferManager.addData(sessionId, 'webpack 5.74.0 compiling...\n');
      bufferManager.addData(sessionId, 'Progress: 25%\n');
      bufferManager.addData(sessionId, 'Progress: 50%\n');
      bufferManager.addData(sessionId, 'Progress: 75%\n');
      bufferManager.addData(sessionId, 'Progress: 100%\n');
      bufferManager.addData(sessionId, fixtures.BUILD_SUCCESS);

      // Wait for processing
      await new Promise(resolve => setImmediate(resolve));

      const progressEvents = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.patternName === 'build-progress'
      );
      const completeEvents = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.patternName === 'build-complete'
      );

      expect(progressEvents).toHaveLength(4); // 25%, 50%, 75%, 100%
      expect(completeEvents).toHaveLength(1);
    });

    it('should handle test output with result parsing', async () => {
      const sessionId = 'test-session';
      bufferManager.createBuffer(sessionId);

      // Register test result pattern
      await eventManager.registerPattern(sessionId, {
        name: 'jest-results',
        type: 'regex',
        pattern: /Tests:\s+(\d+) passed, (\d+) failed/,
      });

      // Add test output
      bufferManager.addData(sessionId, fixtures.JEST_OUTPUT);

      // Wait for processing
      await new Promise(resolve => setImmediate(resolve));

      const testEvents = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.patternName === 'jest-results'
      );

      expect(testEvents).toHaveLength(1);
      expect(testEvents[0].groups).toEqual({
        '1': '1',
        '2': '1',
      });
    });
  });

  describe('custom pattern use cases', () => {
    it('should support Python traceback detection', async () => {
      const sessionId = 'python-session';
      bufferManager.createBuffer(sessionId);

      // Register custom pattern for tracebacks
      await eventManager.registerPattern(sessionId, {
        name: 'python-traceback',
        type: 'custom',
        pattern: (data, buffer) => {
          const tracebackRegex = /Traceback[\s\S]*?(?:^\S|\Z)/m;
          const match = buffer.match(tracebackRegex);
          
          if (match) {
            const errorType = match[0].match(/(\w+Error):/)?.[1];
            return {
              match: match[0].trim(),
              position: buffer.indexOf(match[0]),
              groups: errorType ? { errorType } : undefined,
            };
          }
          return null;
        },
      });

      // Add Python error output
      bufferManager.addData(sessionId, fixtures.PYTHON_ERROR);

      // Wait for processing
      await new Promise(resolve => setImmediate(resolve));

      const tracebackEvents = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.patternName === 'python-traceback'
      );

      expect(tracebackEvents).toHaveLength(1);
      expect(tracebackEvents[0].match).toContain('Traceback');
      expect(tracebackEvents[0].match).toContain('NameError');
      expect(tracebackEvents[0].groups?.errorType).toBe('NameError');
    });

    it('should support interactive prompt detection', async () => {
      const sessionId = 'interactive-session';
      bufferManager.createBuffer(sessionId);

      let promptCount = 0;
      await eventManager.registerPattern(sessionId, {
        name: 'input-prompt',
        type: 'custom',
        pattern: (data) => {
          if (data.endsWith(': ') || data.endsWith('? ')) {
            promptCount++;
            return {
              match: data.trim(),
              position: 0,
              groups: { promptNumber: promptCount.toString() },
            };
          }
          return null;
        },
      });

      // Simulate interactive prompts
      bufferManager.addData(sessionId, 'Enter your name: ');
      bufferManager.addData(sessionId, 'John\n');
      bufferManager.addData(sessionId, 'Enter your age: ');
      bufferManager.addData(sessionId, '25\n');
      bufferManager.addData(sessionId, 'Continue? ');

      // Wait for processing
      await new Promise(resolve => setImmediate(resolve));

      const promptEvents = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.patternName === 'input-prompt'
      );

      expect(promptEvents).toHaveLength(3);
      expect(promptEvents[0].groups?.promptNumber).toBe('1');
      expect(promptEvents[2].groups?.promptNumber).toBe('3');
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large amounts of data efficiently', async () => {
      const sessionId = 'perf-session';
      bufferManager.createBuffer(sessionId);

      // Register a simple pattern
      await eventManager.registerPattern(sessionId, {
        name: 'line-counter',
        type: 'regex',
        pattern: /^/m, // Match start of each line
      });

      // Generate large output
      const lines = 1000;
      const largeOutput = Array(lines).fill('Test line output').join('\n');

      const startTime = performance.now();
      bufferManager.addData(sessionId, largeOutput);

      // Wait for processing
      await new Promise(resolve => setImmediate(resolve));
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      console.log(`Processed ${lines} lines in ${processingTime.toFixed(2)}ms`);

      // Should process reasonably fast (< 1s for 1000 lines)
      expect(processingTime).toBeLessThan(1000);
    });

    it('should handle partial ANSI sequences at chunk boundaries', async () => {
      const sessionId = 'ansi-boundary';
      bufferManager.createBuffer(sessionId);

      // Split ANSI sequence across multiple data chunks
      bufferManager.addData(sessionId, 'Text \x1b[');
      bufferManager.addData(sessionId, '31m');
      bufferManager.addData(sessionId, 'Red text');

      // Wait for processing
      await new Promise(resolve => setImmediate(resolve));

      // Should still detect complete ANSI sequences
      const ansiEvents = collectedEvents.filter(e => e.type === 'ansi-sequence');
      expect(ansiEvents.length).toBeGreaterThan(0);
    });

    it('should handle patterns with debouncing', async () => {
      const sessionId = 'debounce-session';
      bufferManager.createBuffer(sessionId);

      await eventManager.registerPattern(sessionId, {
        name: 'debounced-error',
        type: 'string',
        pattern: 'ERROR',
        options: { debounce: 100 },
      });

      // Rapid error messages
      bufferManager.addData(sessionId, 'ERROR 1\n');
      bufferManager.addData(sessionId, 'ERROR 2\n');
      bufferManager.addData(sessionId, 'ERROR 3\n');

      // Wait for initial processing
      await new Promise(resolve => setImmediate(resolve));

      const initialEvents = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.patternName === 'debounced-error'
      );
      expect(initialEvents).toHaveLength(1); // Only first match due to debounce

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 150));

      // Add another error
      bufferManager.addData(sessionId, 'ERROR 4\n');
      await new Promise(resolve => setImmediate(resolve));

      const allEvents = collectedEvents.filter(
        e => e.type === 'pattern-match' && e.patternName === 'debounced-error'
      );
      expect(allEvents).toHaveLength(2); // Now we have two matches
    });
  });
});