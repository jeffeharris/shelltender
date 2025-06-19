import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerminalDataPipeline, CommonProcessors, CommonFilters } from '../../src/TerminalDataPipeline.js';
import { ProcessedDataEvent } from '@shelltender/core';

describe('TerminalDataPipeline', () => {
  let pipeline: TerminalDataPipeline;

  beforeEach(() => {
    pipeline = new TerminalDataPipeline();
  });

  describe('basic functionality', () => {
    it('should process data through pipeline', async () => {
      const processedEvents: ProcessedDataEvent[] = [];
      
      pipeline.onData(event => processedEvents.push(event));
      
      await pipeline.processData('session-1', 'hello world');
      
      expect(processedEvents).toHaveLength(1);
      expect(processedEvents[0].sessionId).toBe('session-1');
      expect(processedEvents[0].processedData).toBe('hello world');
      expect(processedEvents[0].originalData).toBe('hello world');
      expect(processedEvents[0].transformations).toEqual([]);
    });

    it('should emit raw data event', async () => {
      const rawEvents: any[] = [];
      
      pipeline.on('data:raw', event => rawEvents.push(event));
      
      await pipeline.processData('session-1', 'test data');
      
      expect(rawEvents).toHaveLength(1);
      expect(rawEvents[0].sessionId).toBe('session-1');
      expect(rawEvents[0].data).toBe('test data');
    });
  });

  describe('processors', () => {
    it('should apply processors in priority order', async () => {
      const order: string[] = [];
      
      pipeline.addProcessor('third', event => {
        order.push('third');
        return event;
      }, 30);
      
      pipeline.addProcessor('first', event => {
        order.push('first');
        return event;
      }, 10);
      
      pipeline.addProcessor('second', event => {
        order.push('second');
        return event;
      }, 20);
      
      await pipeline.processData('session-1', 'test');
      
      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('should track transformations', async () => {
      const events: ProcessedDataEvent[] = [];
      
      pipeline.addProcessor('uppercase', event => ({
        ...event,
        data: event.data.toUpperCase()
      }));
      
      pipeline.onData(event => events.push(event));
      
      await pipeline.processData('session-1', 'hello');
      
      expect(events[0].transformations).toContain('uppercase');
      expect(events[0].processedData).toBe('HELLO');
    });

    it('should handle processor returning null', async () => {
      const events: ProcessedDataEvent[] = [];
      const droppedEvents: any[] = [];
      
      pipeline.addProcessor('dropper', () => null);
      
      pipeline.onData(event => events.push(event));
      pipeline.on('data:dropped', event => droppedEvents.push(event));
      
      await pipeline.processData('session-1', 'should be dropped');
      
      expect(events).toHaveLength(0);
      expect(droppedEvents).toHaveLength(1);
      expect(droppedEvents[0].processor).toBe('dropper');
    });

    it('should continue on processor error', async () => {
      const events: ProcessedDataEvent[] = [];
      const errors: any[] = [];
      
      pipeline.addProcessor('error', () => {
        throw new Error('Test error');
      });
      
      pipeline.addProcessor('success', event => ({
        ...event,
        data: event.data + ' processed'
      }));
      
      pipeline.onData(event => events.push(event));
      pipeline.on('error', error => errors.push(error));
      
      await pipeline.processData('session-1', 'test');
      
      expect(events).toHaveLength(1);
      expect(events[0].processedData).toBe('test processed');
      expect(errors).toHaveLength(1);
      expect(errors[0].phase).toBe('processor');
      expect(errors[0].name).toBe('error');
    });
  });

  describe('filters', () => {
    it('should block data when filter returns false', async () => {
      const events: ProcessedDataEvent[] = [];
      const blockedEvents: any[] = [];
      
      pipeline.addFilter('blocker', () => false);
      
      pipeline.onData(event => events.push(event));
      pipeline.on('data:blocked', event => blockedEvents.push(event));
      
      await pipeline.processData('session-1', 'blocked data');
      
      expect(events).toHaveLength(0);
      expect(blockedEvents).toHaveLength(1);
      expect(blockedEvents[0].filter).toBe('blocker');
    });

    it('should continue on filter error', async () => {
      const events: ProcessedDataEvent[] = [];
      const errors: any[] = [];
      
      pipeline.addFilter('error', () => {
        throw new Error('Filter error');
      });
      
      pipeline.onData(event => events.push(event));
      pipeline.on('error', error => errors.push(error));
      
      await pipeline.processData('session-1', 'test');
      
      expect(events).toHaveLength(1);
      expect(errors).toHaveLength(1);
      expect(errors[0].phase).toBe('filter');
    });
  });

  describe('CommonProcessors', () => {
    it('should redact security patterns', async () => {
      const events: ProcessedDataEvent[] = [];
      
      pipeline.addProcessor('security', CommonProcessors.securityFilter([
        /password:\s*\w+/gi,
        /token:\s*\w+/gi
      ]));
      
      pipeline.onData(event => events.push(event));
      
      await pipeline.processData('session-1', 'password: secret123 and token: abc456');
      
      expect(events[0].processedData).toBe('[REDACTED] and [REDACTED]');
    });

    it('should rate limit data', async () => {
      const events: ProcessedDataEvent[] = [];
      const droppedEvents: any[] = [];
      
      const rateLimiter = CommonProcessors.rateLimiter(100); // 100 bytes/second
      pipeline.addProcessor('rate-limit', rateLimiter);
      
      pipeline.onData(event => events.push(event));
      pipeline.on('data:dropped', event => droppedEvents.push(event));
      
      // Send 50 bytes - should pass
      await pipeline.processData('session-1', 'a'.repeat(50));
      
      // Send another 50 bytes - should pass
      await pipeline.processData('session-1', 'b'.repeat(50));
      
      // Send 50 more bytes - should be dropped
      await pipeline.processData('session-1', 'c'.repeat(50));
      
      expect(events).toHaveLength(2);
      expect(droppedEvents).toHaveLength(1);
    });

    it('should strip ANSI codes', async () => {
      const events: ProcessedDataEvent[] = [];
      
      pipeline.addProcessor('ansi', CommonProcessors.ansiStripper());
      pipeline.onData(event => events.push(event));
      
      await pipeline.processData('session-1', '\x1b[31mRed Text\x1b[0m');
      
      expect(events[0].processedData).toBe('Red Text');
    });

    it('should redact credit cards', async () => {
      const events: ProcessedDataEvent[] = [];
      
      pipeline.addProcessor('cc', CommonProcessors.creditCardRedactor());
      pipeline.onData(event => events.push(event));
      
      await pipeline.processData('session-1', 'Card: 4111111111111111');
      
      expect(events[0].processedData).toBe('Card: [CREDIT_CARD_REDACTED]');
    });
  });

  describe('CommonFilters', () => {
    it('should filter binary data', async () => {
      const events: ProcessedDataEvent[] = [];
      const blockedEvents: any[] = [];
      
      pipeline.addFilter('binary', CommonFilters.noBinary());
      
      pipeline.onData(event => events.push(event));
      pipeline.on('data:blocked', event => blockedEvents.push(event));
      
      // Text data should pass
      await pipeline.processData('session-1', 'normal text');
      expect(events).toHaveLength(1);
      
      // Binary data should be blocked
      await pipeline.processData('session-2', 'binary\x00data');
      expect(blockedEvents).toHaveLength(1);
    });

    it('should filter by session allowlist', async () => {
      const events: ProcessedDataEvent[] = [];
      
      pipeline.addFilter('allowlist', CommonFilters.sessionAllowlist(new Set(['allowed-1', 'allowed-2'])));
      pipeline.onData(event => events.push(event));
      
      await pipeline.processData('allowed-1', 'test');
      await pipeline.processData('not-allowed', 'test');
      await pipeline.processData('allowed-2', 'test');
      
      expect(events).toHaveLength(2);
      expect(events.map(e => e.sessionId)).toEqual(['allowed-1', 'allowed-2']);
    });

    it('should filter by data size', async () => {
      const events: ProcessedDataEvent[] = [];
      
      pipeline.addFilter('size', CommonFilters.maxDataSize(10));
      pipeline.onData(event => events.push(event));
      
      await pipeline.processData('session-1', 'short');
      await pipeline.processData('session-2', 'this is too long');
      
      expect(events).toHaveLength(1);
      expect(events[0].sessionId).toBe('session-1');
    });
  });

  describe('subscription methods', () => {
    it('should support onData subscription', async () => {
      const events: ProcessedDataEvent[] = [];
      
      const unsubscribe = pipeline.onData(event => events.push(event));
      
      await pipeline.processData('session-1', 'test1');
      await pipeline.processData('session-2', 'test2');
      
      unsubscribe();
      
      await pipeline.processData('session-3', 'test3');
      
      expect(events).toHaveLength(2);
    });

    it('should support onSessionData subscription', async () => {
      const events: ProcessedDataEvent[] = [];
      
      const unsubscribe = pipeline.onSessionData('session-1', event => events.push(event));
      
      await pipeline.processData('session-1', 'test1');
      await pipeline.processData('session-2', 'test2');
      await pipeline.processData('session-1', 'test3');
      
      expect(events).toHaveLength(2);
      expect(events.every(e => e.sessionId === 'session-1')).toBe(true);
      
      unsubscribe();
    });
  });

  describe('utility methods', () => {
    it('should return processor names', () => {
      pipeline.addProcessor('first', event => event, 10);
      pipeline.addProcessor('second', event => event, 20);
      
      const names = pipeline.getProcessorNames();
      expect(names).toEqual(['first', 'second']);
    });

    it('should return filter names', () => {
      pipeline.addFilter('filter1', () => true);
      pipeline.addFilter('filter2', () => true);
      
      const names = pipeline.getFilterNames();
      expect(names).toContain('filter1');
      expect(names).toContain('filter2');
    });

    it('should clear all processors and filters', () => {
      pipeline.addProcessor('proc1', event => event);
      pipeline.addFilter('filter1', () => true);
      
      pipeline.clear();
      
      expect(pipeline.getProcessorNames()).toEqual([]);
      expect(pipeline.getFilterNames()).toEqual([]);
    });
  });
});