import { describe, it, expect, beforeEach } from 'vitest';
import { BufferManager } from '../../src/BufferManager.js';

describe('BufferManager', () => {
  let bufferManager: BufferManager;

  beforeEach(() => {
    bufferManager = new BufferManager();
  });

  describe('buffer operations', () => {
    it('should add data to buffer', () => {
      const sessionId = 'test-session';
      
      bufferManager.addToBuffer(sessionId, 'Hello ');
      bufferManager.addToBuffer(sessionId, 'World!');
      
      expect(bufferManager.getBuffer(sessionId)).toBe('Hello World!');
    });

    it('should preserve exact formatting including newlines', () => {
      const sessionId = 'test-session';
      const output = 'Line 1\nLine 2\r\nLine 3\n';
      
      bufferManager.addToBuffer(sessionId, output);
      
      expect(bufferManager.getBuffer(sessionId)).toBe(output);
    });

    it('should handle ANSI escape sequences', () => {
      const sessionId = 'test-session';
      const ansiOutput = '\x1b[31mRed Text\x1b[0m\n';
      
      bufferManager.addToBuffer(sessionId, ansiOutput);
      
      expect(bufferManager.getBuffer(sessionId)).toBe(ansiOutput);
    });

    it('should return empty string for non-existent session', () => {
      expect(bufferManager.getBuffer('non-existent')).toBe('');
    });

    it('should clear buffer', () => {
      const sessionId = 'test-session';
      
      bufferManager.addToBuffer(sessionId, 'Some data');
      bufferManager.clearBuffer(sessionId);
      
      expect(bufferManager.getBuffer(sessionId)).toBe('');
    });

    it('should handle large buffers with truncation', () => {
      const sessionId = 'test-session';
      const maxSize = 100000; // Default max buffer size
      
      // Add data that exceeds max size
      const longString = 'a'.repeat(maxSize + 1000);
      bufferManager.addToBuffer(sessionId, longString);
      
      const buffer = bufferManager.getBuffer(sessionId);
      
      // Buffer should be truncated to maxSize
      expect(buffer.length).toBe(maxSize);
      // Should keep the last characters
      expect(buffer).toBe(longString.slice(longString.length - maxSize));
    });

    it('should handle box-drawing characters', () => {
      const sessionId = 'test-session';
      const boxDrawing = '┌─────┐\n│ Box │\n└─────┘\n';
      
      bufferManager.addToBuffer(sessionId, boxDrawing);
      
      expect(bufferManager.getBuffer(sessionId)).toBe(boxDrawing);
    });
  });

  describe('concurrent access', () => {
    it('should handle multiple sessions independently', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      
      bufferManager.addToBuffer(session1, 'Session 1 data');
      bufferManager.addToBuffer(session2, 'Session 2 data');
      
      expect(bufferManager.getBuffer(session1)).toBe('Session 1 data');
      expect(bufferManager.getBuffer(session2)).toBe('Session 2 data');
    });
  });
});