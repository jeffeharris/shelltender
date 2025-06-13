import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { TerminalSession } from '../shared/types.js';
import { BufferManager } from './BufferManager.js';
import { SessionStore } from './SessionStore.js';

interface PtyProcess {
  pty: pty.IPty;
  session: TerminalSession;
  clients: Set<string>;
}

export class SessionManager {
  private sessions: Map<string, PtyProcess> = new Map();
  private bufferManager: BufferManager;
  private sessionStore: SessionStore;

  constructor(bufferManager: BufferManager, sessionStore: SessionStore) {
    this.bufferManager = bufferManager;
    this.sessionStore = sessionStore;
    this.restoreSessions();
  }

  private async restoreSessions(): Promise<void> {
    console.log('Restoring saved sessions...');
    const savedSessions = await this.sessionStore.loadAllSessions();
    
    for (const [sessionId, storedSession] of savedSessions) {
      try {
        // Restore the buffer
        this.bufferManager.addToBuffer(sessionId, storedSession.buffer);
        
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

        // Set up PTY handlers
        this.setupPtyHandlers(sessionId, ptyProcess);

        console.log(`Restored session ${sessionId}`);
      } catch (error) {
        console.error(`Failed to restore session ${sessionId}:`, error);
        await this.sessionStore.deleteSession(sessionId);
      }
    }
  }

  private setupPtyHandlers(sessionId: string, ptyProcess: pty.IPty): void {
    ptyProcess.onData((data: string) => {
      // Store in buffer
      this.bufferManager.addToBuffer(sessionId, data);
      
      // Save to disk periodically
      this.sessionStore.updateSessionBuffer(sessionId, this.bufferManager.getBuffer(sessionId));
      
      // Broadcast to all connected clients
      const processInfo = this.sessions.get(sessionId);
      if (processInfo) {
        this.broadcastToClients(sessionId, {
          type: 'output',
          sessionId,
          data,
        });
      }
    });

    ptyProcess.onExit(() => {
      this.sessions.delete(sessionId);
      this.sessionStore.deleteSession(sessionId);
    });
  }

  createSession(cols: number = 80, rows: number = 24): TerminalSession {
    const sessionId = uuidv4();
    const session: TerminalSession = {
      id: sessionId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      cols,
      rows,
    };

    // Ensure UTF-8 locale
    const env = {
      ...process.env,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      LC_CTYPE: 'en_US.UTF-8',
      TERM: 'xterm-256color',
    } as { [key: string]: string };

    const ptyProcess = pty.spawn('/bin/bash', [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.HOME,
      env,
    });

    this.sessions.set(sessionId, {
      pty: ptyProcess,
      session,
      clients: new Set(),
    });

    // Set up PTY handlers
    this.setupPtyHandlers(sessionId, ptyProcess);
    
    // Save the new session
    this.sessionStore.saveSession(sessionId, session, '', process.env.HOME);

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
      processInfo.pty.write(data);
      return true;
    }
    return false;
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
      
      // Clear the buffer
      this.bufferManager.clearBuffer(sessionId);
      
      // Delete from store
      this.sessionStore.deleteSession(sessionId);
      
      return true;
    }
    return false;
  }

  private broadcastToClients(sessionId: string, data: any): void {
    // This will be implemented by the WebSocket server
    // We'll emit an event that the WebSocket server can listen to
  }

  setClientBroadcaster(broadcaster: (sessionId: string, data: any) => void): void {
    this.broadcastToClients = broadcaster;
  }
}