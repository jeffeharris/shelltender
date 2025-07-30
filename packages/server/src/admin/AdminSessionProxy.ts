import { EventEmitter } from 'events';
import { SessionManager } from '../SessionManager';

interface AdminSessionHandle {
  sessionId: string;
  mode: 'read-only' | 'interactive';
  attachedAt: Date;
}

export class AdminSessionProxy extends EventEmitter {
  private attachedSessions: Map<string, AdminSessionHandle> = new Map();
  
  constructor(private sessionManager: SessionManager) {
    super();
  }

  async attachToSession(sessionId: string, mode: 'read-only' | 'interactive' = 'read-only'): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.attachedSessions.set(sessionId, {
      sessionId,
      mode,
      attachedAt: new Date()
    });

    this.emit('attached', { sessionId, mode });
  }

  async detachFromSession(sessionId: string): Promise<void> {
    this.attachedSessions.delete(sessionId);
    this.emit('detached', { sessionId });
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    const handle = this.attachedSessions.get(sessionId);
    if (!handle || handle.mode !== 'interactive') {
      throw new Error('Session not in interactive mode');
    }

    this.sessionManager.write(sessionId, data);
  }
  
  getAttachedSessions(): AdminSessionHandle[] {
    return Array.from(this.attachedSessions.values());
  }
}