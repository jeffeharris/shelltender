import { Router, Request, Response } from 'express';
import { SessionManager } from '../SessionManager.js';
import { WebSocketServer } from '../WebSocketServer.js';
import { BufferManager } from '../BufferManager.js';
import os from 'os';
import { getProcessMemoryUsage, getProcessCpuUsage } from '../utils/processStats.js';

export interface SessionMetadata {
  id: string;
  command: string;
  args: string[];
  status: 'active' | 'idle' | 'exited';
  createdAt: string;
  lastActivityAt?: string;
  duration: number;
  pid?: number;
  memory?: number;
  cpu?: number;
  cols: number;
  rows: number;
  cwd?: string;
  clientCount: number;
  exitCode?: number;
}

export function createAdminRouter(
  sessionManager: SessionManager,
  wsServer?: WebSocketServer,
  bufferManager?: BufferManager
): Router {
  const router = Router();

  // Get all sessions with metadata
  router.get('/sessions', async (req: Request, res: Response) => {
    try {
      const sessions = sessionManager.getAllSessions();
      const sessionMetadata: SessionMetadata[] = [];

      for (const session of sessions) {
        const now = Date.now();
        const createdAt = new Date(session.createdAt).getTime();
        const duration = now - createdAt;
        
        // Get process stats if available
        let memory: number | undefined;
        let cpu: number | undefined;
        
        // Note: We can't get PID from the current API
        // This would require extending SessionManager
        
        // Determine status based on last activity
        let status: 'active' | 'idle' | 'exited' = 'active';
        if (session.lastAccessedAt) {
          const lastActivity = new Date(session.lastAccessedAt).getTime();
          const idleTime = now - lastActivity;
          if (idleTime > 5 * 60 * 1000) { // 5 minutes
            status = 'idle';
          }
        }

        // Count connected clients
        const clientCount = wsServer ? wsServer.getSessionClientCount(session.id) : 0;

        sessionMetadata.push({
          id: session.id,
          command: session.command || 'bash',
          args: session.args || [],
          status,
          createdAt: new Date(session.createdAt).toISOString(),
          lastActivityAt: session.lastAccessedAt ? new Date(session.lastAccessedAt).toISOString() : undefined,
          duration,
          pid: undefined, // Not available in current API
          memory,
          cpu,
          cols: session.cols || 80,
          rows: session.rows || 24,
          cwd: undefined, // Not available in current API
          clientCount,
          exitCode: undefined // Not available in current API
        });
      }

      res.json({
        sessions: sessionMetadata,
        system: {
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          cpuCount: os.cpus().length,
          platform: os.platform(),
          uptime: process.uptime()
        }
      });
    } catch (error) {
      console.error('Admin sessions error:', error);
      res.status(500).json({ error: 'Failed to fetch sessions', details: (error as Error).message });
    }
  });

  // Get single session details
  router.get('/sessions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = sessionManager.getSession(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Get buffer content (last N lines) if bufferManager is available
      let bufferContent = '';
      let recentOutput = '';
      
      if (bufferManager) {
        bufferContent = bufferManager.getBuffer(id);
        const lines = bufferContent.split('\n');
        recentOutput = lines.slice(-100).join('\n');
      }

      // Get environment variables (filtered)
      const safeEnvVars = {
        TERM: process.env.TERM,
        SHELL: process.env.SHELL,
        USER: process.env.USER,
        HOME: process.env.HOME,
        PATH: process.env.PATH?.split(':').slice(0, 5).join(':') + '...'
      };

      res.json({
        ...session,
        createdAt: new Date(session.createdAt).toISOString(),
        lastAccessedAt: session.lastAccessedAt ? new Date(session.lastAccessedAt).toISOString() : undefined,
        pid: undefined, // Not available in current API
        cwd: process.cwd(), // Use process cwd as fallback
        exitCode: undefined, // Not available in current API
        environment: safeEnvVars,
        bufferSize: bufferContent.length,
        recentOutput,
        childProcesses: [] // TODO: Implement child process tracking
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch session details' });
    }
  });

  // Kill single session
  router.delete('/sessions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { signal = 'SIGTERM' } = req.body;
      
      const success = await sessionManager.killSession(id);
      
      if (success) {
        res.json({ message: 'Session terminated', id });
      } else {
        res.status(404).json({ error: 'Session not found or already terminated' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to terminate session' });
    }
  });

  // Bulk operations
  router.post('/sessions/bulk', async (req: Request, res: Response) => {
    try {
      const { action, sessionIds, signal = 'SIGTERM' } = req.body;
      
      if (action !== 'kill') {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const results = await Promise.all(
        sessionIds.map(async (id: string) => {
          try {
            const success = await sessionManager.killSession(id);
            return { id, success };
          } catch (error) {
            return { id, success: false, error: (error as Error).message };
          }
        })
      );

      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Bulk operation failed' });
    }
  });

  // Kill all sessions
  router.post('/sessions/kill-all', async (req: Request, res: Response) => {
    try {
      const { signal = 'SIGTERM' } = req.body;
      const sessions = sessionManager.getAllSessions();
      
      const results = await Promise.all(
        sessions.map(session => 
          sessionManager.killSession(session.id)
        )
      );

      const killed = results.filter(r => r).length;
      
      res.json({ 
        message: `Terminated ${killed} of ${sessions.length} sessions`,
        killed,
        total: sessions.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to kill all sessions' });
    }
  });

  return router;
}