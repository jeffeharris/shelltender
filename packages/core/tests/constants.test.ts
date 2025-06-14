import { describe, it, expect } from 'vitest';
import { MessageType, DEFAULT_COLS, DEFAULT_ROWS, DEFAULT_BUFFER_SIZE } from '../src/index';

describe('Core Constants', () => {
  it('should export MessageType constants', () => {
    expect(MessageType.OUTPUT).toBe('output');
    expect(MessageType.INPUT).toBe('input');
    expect(MessageType.RESIZE).toBe('resize');
    expect(MessageType.CREATE).toBe('create');
    expect(MessageType.CONNECT).toBe('connect');
    expect(MessageType.DISCONNECT).toBe('disconnect');
    expect(MessageType.ERROR).toBe('error');
    expect(MessageType.BELL).toBe('bell');
    expect(MessageType.EXIT).toBe('exit');
  });

  it('should export default terminal dimensions', () => {
    expect(DEFAULT_COLS).toBe(80);
    expect(DEFAULT_ROWS).toBe(24);
  });

  it('should export default buffer size', () => {
    expect(DEFAULT_BUFFER_SIZE).toBe(10000);
  });
});