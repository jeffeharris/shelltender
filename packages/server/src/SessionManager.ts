import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { TerminalSession, SessionOptions } from '@shelltender/core';
import { SessionStore } from './SessionStore.js';
import { RestrictedShell } from './RestrictedShell.js';
import { ISessionManager } from './interfaces/ISessionManager.js';

interface PtyProcess {
  pty: pty.IPty;
  session: TerminalSession;
  clients: Set<string>;
}

export class SessionManager extends EventEmitter implements ISessionManager {
  private sessions: Map<string, PtyProcess> = new Map();
  private sessionStore: SessionStore;
  private restoredSessions: Set<string> = new Set();

  constructor(sessionStore: SessionStore) {
    super();
    this.sessionStore = sessionStore;
    this.setMaxListeners(100);
    this.restoreSessions();
  }

  private async restoreSessions(): Promise<void> {
    console.log('Restoring saved sessions...');
    const savedSessions = await this.sessionStore.loadAllSessions();
    
    for (const [sessionId, storedSession] of savedSessions) {
      try {
        // Create a new PTY process
        const env = {
          ...process.env,
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
          LC_CTYPE: 'en_US.UTF-8',
          TERM: 'xterm-256color',
        } as { [key: string]: string };

        const ptyProcess = pty.spawn('/bin/bash', [], {
          name: 'xterm-256color',
          cols: storedSession.session.cols,
          rows: storedSession.session.rows,
          cwd: storedSession.cwd || process.env.HOME,
          env,
        });

        // Update session with new creation time but preserve original ID
        const session: TerminalSession = {
          ...storedSession.session,
          id: sessionId,
          lastAccessedAt: new Date(),
        };

        this.sessions.set(sessionId, {
          pty: ptyProcess,
          session,
          clients: new Set(),
        });

        // Set up PTY handlers first
        this.setupPtyHandlers(sessionId, ptyProcess);
        
        // Mark this as a restored session AFTER handlers are set up
        this.restoredSessions.add(sessionId);
        
        // Emit the saved buffer data if any
        if (storedSession.buffer) {
          this.emit('data', sessionId, storedSession.buffer, { source: 'restored' });
        }

        console.log(`Restored session ${sessionId} with ${storedSession.buffer.length} bytes of history`);
      } catch (error) {
        console.error(`Failed to restore session ${sessionId}:`, error);
        await this.sessionStore.deleteSession(sessionId);
      }
    }
  }

  private setupPtyHandlers(sessionId: string, ptyProcess: pty.IPty): void {
    let saveTimer: NodeJS.Timeout | null = null;
    let hasReceivedOutput = false;
    
    ptyProcess.onData((data: string) => {
      // Emit data event for observers
      this.emit('data', sessionId, data, { source: 'pty' });
      
      // For restored sessions, only start saving after we receive new output
      // This prevents re-saving the same buffer that was just restored
      if (this.restoredSessions.has(sessionId) && !hasReceivedOutput) {
        hasReceivedOutput = true;
        this.restoredSessions.delete(sessionId); // No longer need to track
      }
    });

    ptyProcess.onExit(() => {
      // Emit session end event
      this.emit('sessionEnd', sessionId);
      
      this.sessions.delete(sessionId);
      this.restoredSessions.delete(sessionId);
      this.sessionStore.deleteSession(sessionId);
    });
  }

  createSession(options: SessionOptions = {}): TerminalSession {
    const cols = options.cols || 80;
    const rows = options.rows || 24;
    const sessionId = options.id || uuidv4();
    const session: TerminalSession = {
      id: sessionId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      cols,
      rows,
      command: options.command,
      args: options.args,
      locked: options.locked,
    };

    // Set up shell command and environment
    let command = options.command || process.env.SHELL || '/bin/sh';  // Better default
    let args = options.args || [];
    let cwd = options.cwd || process.cwd();  // Use cwd not HOME
    
    // Ensure UTF-8 locale
    let env = {
      ...process.env,
      ...options.env,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      LC_CTYPE: 'en_US.UTF-8',
      TERM: 'xterm-256color',
    } as { [key: string]: string };

    // Apply restrictions if specified
    if (options.restrictToPath || options.blockedCommands || options.readOnlyMode) {
      const restrictedShell = new RestrictedShell(options);
      const shellConfig = restrictedShell.getShellCommand();
      command = shellConfig.command;
      args = shellConfig.args;
      env = { ...env, ...shellConfig.env };
    }


    let ptyProcess;
    try {
      ptyProcess = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env,
      });
    } catch (error) {
      // Provide better error context
      const errorMessage = `Failed to create PTY session: ${error instanceof Error ? error.message : String(error)}`;
      const debugInfo = {
        command,
        args,
        cwd,
        cols,
        rows,
        platform: process.platform,
        shell: command,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      console.error(errorMessage, debugInfo);
      
      // Check common issues
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Shell not found: ${command}. Try using /bin/sh or install ${command}`);
      }
      
      throw new Error(`${errorMessage} (command: ${command}, cwd: ${cwd})`);
    }

    this.sessions.set(sessionId, {
      pty: ptyProcess,
      session,
      clients: new Set(),
    });

    // Set up PTY handlers
    this.setupPtyHandlers(sessionId, ptyProcess);
    
    // Save the new session with the actual cwd
    this.sessionStore.saveSession(sessionId, session, '', cwd);

    return session;
  }

  getSession(sessionId: string): TerminalSession | null {
    const processInfo = this.sessions.get(sessionId);
    if (processInfo) {
      processInfo.session.lastAccessedAt = new Date();
      return processInfo.session;
    }
    return null;
  }

  writeToSession(sessionId: string, data: string): boolean {
    const processInfo = this.sessions.get(sessionId);
    if (processInfo) {
      try {
        processInfo.pty.write(data);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  // Send a command to a session (adds newline automatically)
  sendCommand(sessionId: string, command: string): boolean {
    return this.writeToSession(sessionId, command + '\n');
  }

  // Send raw input without modification
  sendRawInput(sessionId: string, data: string): boolean {
    return this.writeToSession(sessionId, data);
  }

  // Send special keys
  sendKey(sessionId: string, key: 'ctrl-c' | 'ctrl-d' | 'ctrl-z' | 'ctrl-r' | 'tab' | 'escape' | 'up' | 'down' | 'left' | 'right'): boolean {
    const keyMap: Record<string, string> = {
      'ctrl-c': '\x03',
      'ctrl-d': '\x04',
      'ctrl-z': '\x1a',
      'ctrl-r': '\x12',
      'tab': '\t',
      'escape': '\x1b',
      'up': '\x1b[A',
      'down': '\x1b[B',
      'left': '\x1b[D',
      'right': '\x1b[C'
    };
    
    const sequence = keyMap[key];
    if (!sequence) return false;
    
    return this.writeToSession(sessionId, sequence);
  }

  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const processInfo = this.sessions.get(sessionId);
    if (processInfo) {
      processInfo.pty.resize(cols, rows);
      processInfo.session.cols = cols;
      processInfo.session.rows = rows;
      return true;
    }
    return false;
  }

  addClient(sessionId: string, clientId: string): void {
    const processInfo = this.sessions.get(sessionId);
    if (processInfo) {
      processInfo.clients.add(clientId);
    }
  }

  removeClient(sessionId: string, clientId: string): void {
    const processInfo = this.sessions.get(sessionId);
    if (processInfo) {
      processInfo.clients.delete(clientId);
    }
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).map(p => p.session);
  }

  killSession(sessionId: string): boolean {
    const processInfo = this.sessions.get(sessionId);
    if (processInfo) {
      // Kill the PTY process
      processInfo.pty.kill();
      
      // Remove from sessions map
      this.sessions.delete(sessionId);
      
      // Emit session end event
      this.emit('sessionEnd', sessionId);
      
      // Delete from store
      this.sessionStore.deleteSession(sessionId);
      
      return true;
    }
    return false;
  }

  // Implement IDataEmitter interface methods
  onData(callback: (sessionId: string, data: string, metadata?: any) => void): () => void {
    this.on('data', callback);
    return () => this.off('data', callback);
  }

  onSessionEnd(callback: (sessionId: string) => void): () => void {
    this.on('sessionEnd', callback);
    return () => this.off('sessionEnd', callback);
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}