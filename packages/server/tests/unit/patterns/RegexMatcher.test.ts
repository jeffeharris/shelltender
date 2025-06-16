import { describe, it, expect, beforeEach } from 'vitest';
import { RegexMatcher } from '../../../src/patterns/RegexMatcher';
import { PatternConfig } from '@shelltender/core';
import * as fixtures from '../../fixtures/terminal-outputs';

describe('RegexMatcher', () => {
  describe('constructor', () => {
    it('should create matcher with RegExp pattern', () => {
      const config: PatternConfig = {
        name: 'test-regex',
        type: 'regex',
        pattern: /test/,
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      expect(matcher.getName()).toBe('test-regex');
      expect(matcher.getId()).toBe('test-id');
    });

    it('should create matcher with string pattern', () => {
      const config: PatternConfig = {
        name: 'test-regex',
        type: 'regex',
        pattern: 'test.*pattern',
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      expect(matcher.getName()).toBe('test-regex');
    });

    it('should throw error for invalid pattern type', () => {
      const config: PatternConfig = {
        name: 'test-regex',
        type: 'regex',
        pattern: 123 as any,
      };
      
      expect(() => new RegexMatcher(config, 'test-id')).toThrow('RegexMatcher requires a string or RegExp pattern');
    });
  });

  describe('match', () => {
    it('should match simple patterns', () => {
      const config: PatternConfig = {
        name: 'error-pattern',
        type: 'regex',
        pattern: /Error:/,
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      const result = matcher.match(fixtures.BUILD_ERROR, fixtures.BUILD_ERROR);
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Error:');
      expect(result!.position).toBe(43); // Accounts for leading newline in BUILD_ERROR
    });

    it('should extract capture groups', () => {
      const config: PatternConfig = {
        name: 'test-results',
        type: 'regex',
        pattern: /Tests:\s+(\d+) passed, (\d+) total/,
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      const result = matcher.match(fixtures.JEST_OUTPUT, fixtures.JEST_OUTPUT);
      
      expect(result).not.toBeNull();
      expect(result!.groups).toEqual({
        '1': '1',
        '2': '1',
      });
    });

    it('should extract named capture groups', () => {
      const config: PatternConfig = {
        name: 'test-results',
        type: 'regex',
        pattern: /Tests:\s+(?<passed>\d+) passed, (?<total>\d+) total/,
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      const result = matcher.match(fixtures.JEST_OUTPUT, fixtures.JEST_OUTPUT);
      
      expect(result).not.toBeNull();
      expect(result!.groups).toEqual({
        '1': '1',
        '2': '1',
        'passed': '1',
        'total': '1',
      });
    });

    it('should handle case-insensitive matching', () => {
      const config: PatternConfig = {
        name: 'error-pattern',
        type: 'regex',
        pattern: 'error',
        options: { caseSensitive: false },
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      const result = matcher.match('ERROR: Something failed', '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('ERROR');
    });

    it('should handle multiline patterns', () => {
      const config: PatternConfig = {
        name: 'traceback',
        type: 'regex',
        pattern: /Traceback[\s\S]*?Error: .+$/m,
        options: { multiline: true },
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      const result = matcher.match(fixtures.PYTHON_ERROR, fixtures.PYTHON_ERROR);
      
      expect(result).not.toBeNull();
      expect(result!.match).toContain('Traceback');
      expect(result!.match).toContain('NameError');
    });

    it('should return null for no match', () => {
      const config: PatternConfig = {
        name: 'not-found',
        type: 'regex',
        pattern: /NOTFOUND/,
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      const result = matcher.match(fixtures.BUILD_SUCCESS, fixtures.BUILD_SUCCESS);
      
      expect(result).toBeNull();
    });
  });

  describe('validate', () => {
    it('should validate valid regex patterns', () => {
      const config: PatternConfig = {
        name: 'valid',
        type: 'regex',
        pattern: /test/,
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      expect(() => matcher.validate()).not.toThrow();
    });

    it('should throw for invalid regex string', () => {
      const config: PatternConfig = {
        name: 'invalid',
        type: 'regex',
        pattern: '[unclosed',
      };
      
      expect(() => new RegexMatcher(config, 'test-id')).toThrow('Invalid regular expression');
    });
  });

  describe('debouncing', () => {
    it('should respect debounce timing', async () => {
      const config: PatternConfig = {
        name: 'debounced',
        type: 'regex',
        pattern: /test/,
        options: { debounce: 100 },
      };
      
      const matcher = new RegexMatcher(config, 'test-id');
      
      // First match should work
      const result1 = matcher.tryMatch('test 1', 'test 1');
      expect(result1).not.toBeNull();
      
      // Immediate second match should be debounced
      const result2 = matcher.tryMatch('test 2', 'test 2');
      expect(result2).toBeNull();
      
      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Now it should match again
      const result3 = matcher.tryMatch('test 3', 'test 3');
      expect(result3).not.toBeNull();
    });
  });
});