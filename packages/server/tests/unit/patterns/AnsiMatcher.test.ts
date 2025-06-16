import { describe, it, expect } from 'vitest';
import { AnsiMatcher } from '../../../src/patterns/AnsiMatcher';
import { PatternConfig } from '@shelltender/core';
import * as fixtures from '../../fixtures/terminal-outputs';

describe('AnsiMatcher', () => {
  describe('constructor', () => {
    it('should create matcher with predefined pattern names', () => {
      const patterns = ['csi', 'cursor', 'color', 'osc', 'title', 'esc', 'any', 'all'];
      
      for (const pattern of patterns) {
        const config: PatternConfig = {
          name: `test-${pattern}`,
          type: 'ansi',
          pattern,
        };
        
        const matcher = new AnsiMatcher(config, 'test-id');
        expect(matcher.getName()).toBe(`test-${pattern}`);
      }
    });

    it('should create matcher with custom regex string', () => {
      const config: PatternConfig = {
        name: 'custom-ansi',
        type: 'ansi',
        pattern: '\\x1b\\[\\d+m',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      expect(matcher.getName()).toBe('custom-ansi');
    });

    it('should create matcher with RegExp pattern', () => {
      const config: PatternConfig = {
        name: 'custom-ansi',
        type: 'ansi',
        pattern: /\x1b\[\d+m/,
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      expect(matcher.getName()).toBe('custom-ansi');
    });

    it('should default to "any" pattern when pattern is invalid', () => {
      const config: PatternConfig = {
        name: 'default-ansi',
        type: 'ansi',
        pattern: {} as any,
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      // Should not throw and should work with default pattern
      const result = matcher.match(fixtures.ANSI_COLORED, '');
      expect(result).not.toBeNull();
    });
  });

  describe('match', () => {
    it('should match color sequences', () => {
      const config: PatternConfig = {
        name: 'color-match',
        type: 'ansi',
        pattern: 'color',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match(fixtures.ANSI_COLORED, '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('\x1b[31m');
      expect(result!.groups).toEqual({
        type: 'color',
        command: 'm',
        params: [31],
        raw: '\x1b[31m',
      });
    });

    it('should match cursor movement sequences', () => {
      const config: PatternConfig = {
        name: 'cursor-match',
        type: 'ansi',
        pattern: 'cursor',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match(fixtures.ANSI_CURSOR_UP, '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('\x1b[2A');
      expect(result!.groups).toEqual({
        type: 'cursor',
        command: 'A',
        params: [2],
        raw: '\x1b[2A',
      });
    });

    it('should match clear screen sequences', () => {
      const config: PatternConfig = {
        name: 'clear-match',
        type: 'ansi',
        pattern: 'any',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match(fixtures.ANSI_CLEAR_SCREEN, '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('\x1b[2J');
      expect(result!.groups).toEqual({
        type: 'clear',
        command: 'J',
        params: [2],
        raw: '\x1b[2J',
      });
    });

    it('should match OSC sequences (window title)', () => {
      const config: PatternConfig = {
        name: 'title-match',
        type: 'ansi',
        pattern: 'osc',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match(fixtures.ANSI_SET_TITLE, '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('\x1b]0;Terminal Title\x07');
      expect(result!.groups).toEqual({
        type: 'osc',
        code: 0,
        data: 'Terminal Title',
        raw: '\x1b]0;Terminal Title\x07',
      });
    });

    it('should match reset sequence', () => {
      const config: PatternConfig = {
        name: 'reset-match',
        type: 'ansi',
        pattern: 'any',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match('\x1b[0m', '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('\x1b[0m');
      expect(result!.groups?.type).toBe('color');
      expect(result!.groups?.params).toEqual([0]);
    });

    it('should handle sequences without parameters', () => {
      const config: PatternConfig = {
        name: 'no-params',
        type: 'ansi',
        pattern: 'any',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match('\x1b[H', ''); // Home cursor
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('\x1b[H');
      expect(result!.groups?.params).toEqual([]);
    });

    it('should match first sequence in mixed output', () => {
      const config: PatternConfig = {
        name: 'mixed',
        type: 'ansi',
        pattern: 'any',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match(fixtures.MIXED_OUTPUT, '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('\x1b[32m');
    });

    it('should return null for no ANSI sequences', () => {
      const config: PatternConfig = {
        name: 'no-ansi',
        type: 'ansi',
        pattern: 'any',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      const result = matcher.match('Plain text without ANSI', '');
      
      expect(result).toBeNull();
    });
  });

  describe('categorization', () => {
    it('should correctly categorize CSI commands', () => {
      const config: PatternConfig = {
        name: 'categorize',
        type: 'ansi',
        pattern: 'any',
      };
      
      const matcher = new AnsiMatcher(config, 'test-id');
      
      const testCases = [
        { input: '\x1b[A', expectedType: 'cursor' },     // Cursor up
        { input: '\x1b[B', expectedType: 'cursor' },     // Cursor down
        { input: '\x1b[C', expectedType: 'cursor' },     // Cursor forward
        { input: '\x1b[D', expectedType: 'cursor' },     // Cursor back
        { input: '\x1b[H', expectedType: 'cursor' },     // Cursor home
        { input: '\x1b[31m', expectedType: 'color' },    // Red text
        { input: '\x1b[0m', expectedType: 'color' },     // Reset
        { input: '\x1b[2J', expectedType: 'clear' },     // Clear screen
        { input: '\x1b[K', expectedType: 'clear' },      // Clear line
        { input: '\x1b[s', expectedType: 'other' },      // Save cursor
      ];
      
      for (const { input, expectedType } of testCases) {
        const result = matcher.match(input, '');
        expect(result).not.toBeNull();
        expect(result!.groups?.type).toBe(expectedType);
      }
    });
  });
});