import fs from 'fs/promises';
import path from 'path';
import { TerminalSession, PatternConfig } from '@shelltender/core';

export interface StoredSession {
  session: TerminalSession;
  buffer: string;
  cwd?: string;
  env?: Record<string, string>;
  patterns?: PatternConfig[];
}

export class SessionStore {
  private storePath: string;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(storePath: string = '.sessions') {
    this.storePath = storePath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.ensureStoreExists();
    await this.initPromise;
    this.initialized = true;
  }

  private async ensureStoreExists(): Promise<void> {
    try {
      await fs.mkdir(this.storePath, { recursive: true });
    } catch (error) {
      console.error('Error creating session store directory:', error);
      throw error; // Re-throw to prevent silent failures
    }
  }

  async saveSession(sessionId: string, session: TerminalSession, buffer: string, cwd?: string): Promise<void> {
    await this.initialize();
    try {
      const sessionData: StoredSession = {
        session,
        buffer,
        cwd,
        env: {
          TERM: process.env.TERM || 'xterm-256color',
          LANG: process.env.LANG || 'en_US.UTF-8',
        }
      };

      const filePath = path.join(this.storePath, `${sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error saving session ${sessionId}:`, error);
    }
  }

  async loadSession(sessionId: string): Promise<StoredSession | null> {
    await this.initialize();
    try {
      const filePath = path.join(this.storePath, `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async loadAllSessions(): Promise<Map<string, StoredSession>> {
    await this.initialize();
    const sessions = new Map<string, StoredSession>();
    
    try {
      const files = await fs.readdir(this.storePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const session = await this.loadSession(sessionId);
          
          if (session) {
            sessions.set(sessionId, session);
          }
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }

    return sessions;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.initialize();
    try {
      const filePath = path.join(this.storePath, `${sessionId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  async deleteAllSessions(): Promise<void> {
    await this.initialize();
    try {
      await fs.rm(this.storePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }

  async updateSessionBuffer(sessionId: string, buffer: string): Promise<void> {
    await this.initialize();
    try {
      const filePath = path.join(this.storePath, `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const storedSession: StoredSession = JSON.parse(data);
      
      // Only update if buffer has actually changed to avoid unnecessary writes
      if (storedSession.buffer !== buffer) {
        storedSession.buffer = buffer;
        await fs.writeFile(filePath, JSON.stringify(storedSession, null, 2), 'utf-8');
      }
    } catch (error) {
      // Session might not exist yet, ignore
    }
  }

  async saveSessionPatterns(sessionId: string, patterns: PatternConfig[]): Promise<void> {
    await this.initialize();
    try {
      const filePath = path.join(this.storePath, `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const storedSession: StoredSession = JSON.parse(data);
      
      storedSession.patterns = patterns;
      await fs.writeFile(filePath, JSON.stringify(storedSession, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error saving patterns for session ${sessionId}:`, error);
    }
  }

  async getSessionPatterns(sessionId: string): Promise<PatternConfig[]> {
    await this.initialize();
    try {
      const session = await this.loadSession(sessionId);
      return session?.patterns || [];
    } catch (error) {
      return [];
    }
  }
}