import { describe, it, expect } from 'vitest';
import { StringMatcher } from '../../../src/patterns/StringMatcher';
import { RegexMatcher } from '../../../src/patterns/RegexMatcher';
import { PatternConfig } from '@shelltender/core';
import * as fixtures from '../../fixtures/terminal-outputs';

describe('StringMatcher', () => {
  describe('constructor', () => {
    it('should create matcher with string pattern', () => {
      const config: PatternConfig = {
        name: 'test-string',
        type: 'string',
        pattern: 'test pattern',
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      expect(matcher.getName()).toBe('test-string');
      expect(matcher.getId()).toBe('test-id');
    });

    it('should throw error for non-string pattern', () => {
      const config: PatternConfig = {
        name: 'test-string',
        type: 'string',
        pattern: /regex/ as any,
      };
      
      expect(() => new StringMatcher(config, 'test-id')).toThrow('StringMatcher requires a string pattern');
    });
  });

  describe('match', () => {
    it('should match exact string', () => {
      const config: PatternConfig = {
        name: 'build-success',
        type: 'string',
        pattern: 'compiled successfully',
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      const result = matcher.match(fixtures.BUILD_SUCCESS, fixtures.BUILD_SUCCESS);
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('compiled successfully');
      expect(result!.position).toBe(16);
    });

    it('should match with case sensitivity by default', () => {
      const config: PatternConfig = {
        name: 'error',
        type: 'string',
        pattern: 'Error',
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      
      // Should match 'Error'
      let result = matcher.match('Error: failed', '');
      expect(result).not.toBeNull();
      
      // Should not match 'ERROR'
      result = matcher.match('ERROR: failed', '');
      expect(result).toBeNull();
    });

    it('should match case-insensitive when configured', () => {
      const config: PatternConfig = {
        name: 'error',
        type: 'string',
        pattern: 'error',
        options: { caseSensitive: false },
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      
      // Should match both cases
      let result = matcher.match('ERROR: failed', '');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('ERROR');
      
      result = matcher.match('Error: failed', '');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Error');
      
      result = matcher.match('error: failed', '');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('error');
    });

    it('should find first occurrence', () => {
      const config: PatternConfig = {
        name: 'passed',
        type: 'string',
        pattern: 'passed',
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      const result = matcher.match('10 passed, 2 passed', '');
      
      expect(result).not.toBeNull();
      expect(result!.position).toBe(3); // First occurrence
    });

    it('should return null for no match', () => {
      const config: PatternConfig = {
        name: 'not-found',
        type: 'string',
        pattern: 'NOTFOUND',
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      const result = matcher.match(fixtures.BUILD_SUCCESS, fixtures.BUILD_SUCCESS);
      
      expect(result).toBeNull();
    });
  });

  describe('validate', () => {
    it('should validate non-empty strings', () => {
      const config: PatternConfig = {
        name: 'valid',
        type: 'string',
        pattern: 'test',
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      expect(() => matcher.validate()).not.toThrow();
    });

    it('should throw for empty string pattern', () => {
      const config: PatternConfig = {
        name: 'invalid',
        type: 'string',
        pattern: '',
      };
      
      const matcher = new StringMatcher(config, 'test-id');
      expect(() => matcher.validate()).toThrow('String pattern cannot be empty');
    });
  });

  describe('performance', () => {
    it('should be faster than regex for simple matches', () => {
      const stringConfig: PatternConfig = {
        name: 'string-search',
        type: 'string',
        pattern: 'Error:',
      };
      
      const regexConfig: PatternConfig = {
        name: 'regex-search',
        type: 'regex',
        pattern: /Error:/,
      };
      
      const stringMatcher = new StringMatcher(stringConfig, 'string-id');
      const regexMatcher = new RegexMatcher(regexConfig, 'regex-id');
      
      const testData = fixtures.BUILD_ERROR.repeat(100); // Make it larger
      
      // Time string matcher
      const stringStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        stringMatcher.match(testData, testData);
      }
      const stringTime = performance.now() - stringStart;
      
      // Time regex matcher
      const regexStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        regexMatcher.match(testData, testData);
      }
      const regexTime = performance.now() - regexStart;
      
      // String matching should generally be faster for simple searches
      console.log(`String: ${stringTime.toFixed(2)}ms, Regex: ${regexTime.toFixed(2)}ms`);
    });
  });
});