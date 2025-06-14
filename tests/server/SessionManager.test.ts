import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../src/server/SessionManager.js';
import { BufferManager } from '../../src/server/BufferManager.js';
import { SessionStore } from '../../src/server/SessionStore.js';
import * as fs from 'fs/promises';

// Mock node-pty with proper structure
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

vi.mock('fs/promises');

// Mock SessionStore to prevent actual file operations
vi.mock('../../src/server/SessionStore.js', () => {
  const mockStore = {
    loadAllSessions: vi.fn().mockResolvedValue(new Map()),
    saveSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    updateSessionBuffer: vi.fn().mockResolvedValue(undefined)
  };
  
  return {
    SessionStore: vi.fn(() => mockStore)
  };
});

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let bufferManager: BufferManager;
  let sessionStore: SessionStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    bufferManager = new BufferManager();
    sessionStore = new SessionStore('.test-sessions');
    
    // Wait a bit for the async constructor operations
    await new Promise(resolve => setTimeout(resolve, 50));
    
    sessionManager = new SessionManager(bufferManager, sessionStore);
  });

  describe('createSession', () => {
    it('should create a basic session with default options', () => {
      const session = sessionManager.createSession();
      
      expect(session).toMatchObject({
        id: expect.any(String),
        createdAt: expect.any(Date),
        lastAccessedAt: expect.any(Date),
        cols: 80,
        rows: 24
      });
    });

    it('should create a session with custom command', () => {
      const session = sessionManager.createSession({
        command: '/usr/bin/python',
        args: ['-i'],
        cols: 100,
        rows: 30
      });
      
      expect(session.command).toBe('/usr/bin/python');
      expect(session.args).toEqual(['-i']);
      expect(session.cols).toBe(100);
      expect(session.rows).toBe(30);
    });

    it('should create a restricted session', () => {
      const session = sessionManager.createSession({
        restrictToPath: '/home/user/project',
        blockedCommands: ['rm', 'sudo'],
        readOnlyMode: true
      });
      
      expect(session).toBeDefined();
      // The restrictions are applied internally to the PTY process
    });
  });

  describe('programmatic input methods', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = sessionManager.createSession();
      sessionId = session.id;
    });

    it('should send commands with newline', () => {
      const result = sessionManager.sendCommand(sessionId, 'ls -la');
      expect(result).toBe(true);
    });

    it('should send raw input without modification', () => {
      const result = sessionManager.sendRawInput(sessionId, 'test');
      expect(result).toBe(true);
    });

    it('should send special keys', () => {
      expect(sessionManager.sendKey(sessionId, 'ctrl-c')).toBe(true);
      expect(sessionManager.sendKey(sessionId, 'ctrl-r')).toBe(true);
      expect(sessionManager.sendKey(sessionId, 'tab')).toBe(true);
    });

    it('should return false for non-existent session', () => {
      expect(sessionManager.sendCommand('invalid-id', 'ls')).toBe(false);
      expect(sessionManager.sendKey('invalid-id', 'ctrl-c')).toBe(false);
    });
  });

  describe('session management', () => {
    it('should get all sessions', () => {
      sessionManager.createSession();
      sessionManager.createSession();
      
      const sessions = sessionManager.getAllSessions();
      expect(sessions).toHaveLength(2);
    });

    it('should kill a session', () => {
      const session = sessionManager.createSession();
      const result = sessionManager.killSession(session.id);
      
      expect(result).toBe(true);
      expect(sessionManager.getSession(session.id)).toBeNull();
    });

    it('should resize a session', () => {
      const session = sessionManager.createSession();
      const result = sessionManager.resizeSession(session.id, 120, 40);
      
      expect(result).toBe(true);
      const updatedSession = sessionManager.getSession(session.id);
      expect(updatedSession?.cols).toBe(120);
      expect(updatedSession?.rows).toBe(40);
    });
  });
});