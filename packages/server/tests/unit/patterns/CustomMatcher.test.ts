import { describe, it, expect } from 'vitest';
import { CustomMatcher } from '../../../src/patterns/CustomMatcher';
import { PatternConfig, CustomMatcher as CustomMatcherFn } from '@shelltender/core';

describe('CustomMatcher', () => {
  describe('constructor', () => {
    it('should create matcher with function pattern', () => {
      const matcherFn: CustomMatcherFn = (data, buffer) => null;
      
      const config: PatternConfig = {
        name: 'test-custom',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      expect(matcher.getName()).toBe('test-custom');
      expect(matcher.getId()).toBe('test-id');
    });

    it('should throw error for non-function pattern', () => {
      const config: PatternConfig = {
        name: 'test-custom',
        type: 'custom',
        pattern: 'not a function' as any,
      };
      
      expect(() => new CustomMatcher(config, 'test-id')).toThrow('CustomMatcher requires a function pattern');
    });
  });

  describe('match', () => {
    it('should execute custom matcher function', () => {
      const matcherFn: CustomMatcherFn = (data, buffer) => {
        if (data.includes('SUCCESS')) {
          return {
            match: 'SUCCESS',
            position: data.indexOf('SUCCESS'),
          };
        }
        return null;
      };
      
      const config: PatternConfig = {
        name: 'success-detector',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      const result = matcher.match('Build SUCCESS!', '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('SUCCESS');
      expect(result!.position).toBe(6);
    });

    it('should pass both data and buffer to matcher function', () => {
      let receivedData = '';
      let receivedBuffer = '';
      
      const matcherFn: CustomMatcherFn = (data, buffer) => {
        receivedData = data;
        receivedBuffer = buffer;
        return null;
      };
      
      const config: PatternConfig = {
        name: 'capture-args',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      matcher.match('new data', 'full buffer');
      
      expect(receivedData).toBe('new data');
      expect(receivedBuffer).toBe('full buffer');
    });

    it('should handle matcher function errors gracefully', () => {
      const matcherFn: CustomMatcherFn = () => {
        throw new Error('Matcher error');
      };
      
      const config: PatternConfig = {
        name: 'error-matcher',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      const result = matcher.match('test', '');
      
      // Should return null instead of throwing
      expect(result).toBeNull();
    });

    it('should support complex matching logic', () => {
      // Example: Match lines that contain both "error" and a line number
      const matcherFn: CustomMatcherFn = (data, buffer) => {
        const lines = data.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes('error') && /line \d+/.test(line)) {
            const match = line.match(/error.*line \d+/i);
            if (match) {
              return {
                match: match[0],
                position: data.indexOf(match[0]),
                groups: {
                  lineNumber: line.match(/line (\d+)/)?.[1] || '',
                },
              };
            }
          }
        }
        return null;
      };
      
      const config: PatternConfig = {
        name: 'error-line-matcher',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      const result = matcher.match('Syntax error at line 42 in file.js', '');
      
      expect(result).not.toBeNull();
      expect(result!.match).toBe('error at line 42');
      expect(result!.groups?.lineNumber).toBe('42');
    });
  });

  describe('validate', () => {
    it('should validate matcher functions', () => {
      const matcherFn: CustomMatcherFn = (data, buffer) => null;
      
      const config: PatternConfig = {
        name: 'valid',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      expect(() => matcher.validate()).not.toThrow();
    });

    it('should catch validation errors in matcher function', () => {
      const matcherFn: CustomMatcherFn = (data, buffer) => {
        if (data === '' && buffer === '') {
          throw new Error('Validation error');
        }
        return null;
      };
      
      const config: PatternConfig = {
        name: 'invalid',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      expect(() => matcher.validate()).toThrow('Invalid custom matcher: Validation error');
    });
  });

  describe('use cases', () => {
    it('should support multiline pattern matching', () => {
      // Example: Match Python tracebacks
      const matcherFn: CustomMatcherFn = (data, buffer) => {
        const tracebackRegex = /Traceback[\s\S]*?(?=\n(?!\s)|$)/;
        const match = buffer.match(tracebackRegex);
        
        if (match) {
          return {
            match: match[0],
            position: buffer.indexOf(match[0]),
            groups: {
              errorType: match[0].match(/(\w+Error):/)?.[1] || 'Unknown',
            },
          };
        }
        return null;
      };
      
      const config: PatternConfig = {
        name: 'python-traceback',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      const pythonError = `Traceback (most recent call last):
  File "test.py", line 10, in <module>
    print(undefined_var)
NameError: name 'undefined_var' is not defined`;
      
      const result = matcher.match(pythonError, pythonError);
      
      expect(result).not.toBeNull();
      expect(result!.match).toContain('Traceback');
      expect(result!.match).toContain('NameError');
      expect(result!.groups?.errorType).toBe('NameError');
    });

    it('should support stateful matching', () => {
      // Example: Match when output stops changing
      let lastData = '';
      let unchangedCount = 0;
      
      const matcherFn: CustomMatcherFn = (data, buffer) => {
        if (data === lastData) {
          unchangedCount++;
          if (unchangedCount >= 3) {
            return {
              match: 'Output idle',
              position: 0,
              groups: {
                idleCount: unchangedCount.toString(),
              },
            };
          }
        } else {
          lastData = data;
          unchangedCount = 0;
        }
        return null;
      };
      
      const config: PatternConfig = {
        name: 'idle-detector',
        type: 'custom',
        pattern: matcherFn,
      };
      
      const matcher = new CustomMatcher(config, 'test-id');
      
      // First few identical outputs don't trigger
      expect(matcher.match('same', 'same')).toBeNull();
      expect(matcher.match('same', 'same')).toBeNull();
      
      // Third identical output triggers
      const result = matcher.match('same', 'same');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Output idle');
      expect(result!.groups?.idleCount).toBe('3');
    });
  });
});