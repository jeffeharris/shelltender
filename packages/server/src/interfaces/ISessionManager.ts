import { TerminalSession, SessionOptions } from '@shelltender/core';

export interface IDataEmitter {
  onData(callback: (sessionId: string, data: string, metadata?: any) => void): () => void;
  onSessionEnd(callback: (sessionId: string) => void): () => void;
}

export interface ISessionManager extends IDataEmitter {
  createSession(options: SessionOptions): TerminalSession;
  getSession(sessionId: string): TerminalSession | null;
  writeToSession(sessionId: string, data: string): boolean;
  killSession(sessionId: string): boolean;
  getAllSessions(): TerminalSession[];
  getActiveSessionIds(): string[];
  resizeSession(sessionId: string, cols: number, rows: number): boolean;
}