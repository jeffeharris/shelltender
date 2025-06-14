import { describe, it, expect } from 'vitest';
import type { TerminalSession, SessionOptions, TerminalData } from '../src/index';

describe('Core Types', () => {
  it('should export TerminalSession type', () => {
    const session: TerminalSession = {
      id: 'test-session',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      cols: 80,
      rows: 24
    };
    
    expect(session.id).toBe('test-session');
    expect(session.cols).toBe(80);
    expect(session.rows).toBe(24);
  });

  it('should export SessionOptions type', () => {
    const options: SessionOptions = {
      command: '/bin/bash',
      args: ['-l'],
      cwd: '/home/user',
      cols: 120,
      rows: 40,
      restrictToPath: '/home/user/sandbox',
      blockedCommands: ['sudo', 'su']
    };
    
    expect(options.command).toBe('/bin/bash');
    expect(options.restrictToPath).toBe('/home/user/sandbox');
    expect(options.blockedCommands).toEqual(['sudo', 'su']);
  });

  it('should export TerminalData type', () => {
    const data: TerminalData = {
      type: 'output',
      sessionId: 'test-session',
      data: 'Hello, world!\n'
    };
    
    expect(data.type).toBe('output');
    expect(data.sessionId).toBe('test-session');
    expect(data.data).toBe('Hello, world!\n');
  });
});