import { WebSocketServer as WSServer } from 'ws';
import { SessionManager } from './SessionManager.js';
import { BufferManager } from './BufferManager.js';
import { TerminalData } from '@shelltender/core';

export class WebSocketServer {
  private wss: WSServer;
  private sessionManager: SessionManager;
  private bufferManager: BufferManager;
  private clients: Map<string, any> = new Map();

  constructor(port: number, sessionManager: SessionManager, bufferManager: BufferManager) {
    this.sessionManager = sessionManager;
    this.bufferManager = bufferManager;
    this.wss = new WSServer({ port });

    // Set up the broadcaster for the session manager
    this.sessionManager.setClientBroadcaster((sessionId: string, data: any) => {
      this.broadcastToSession(sessionId, data);
    });

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws) => {
      const clientId = Math.random().toString(36).substring(7);
      this.clients.set(clientId, ws);

      ws.on('message', (message: string) => {
        try {
          const data: TerminalData = JSON.parse(message);
          this.handleMessage(clientId, ws, data);
        } catch (error) {
          console.error('Error parsing message:', error);
          ws.send(JSON.stringify({ type: 'error', data: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        // Remove client from all sessions
        for (const session of this.sessionManager.getAllSessions()) {
          this.sessionManager.removeClient(session.id, clientId);
        }
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private handleMessage(clientId: string, ws: any, data: TerminalData): void {
    switch (data.type) {
      case 'create':
        const options = data.options || {};
        if (data.cols) options.cols = data.cols;
        if (data.rows) options.rows = data.rows;
        
        const session = this.sessionManager.createSession(options);
        this.sessionManager.addClient(session.id, clientId);
        ws.sessionId = session.id;
        
        ws.send(JSON.stringify({
          type: 'create',
          sessionId: session.id,
          session,
        }));
        break;

      case 'connect':
        if (data.sessionId) {
          const session = this.sessionManager.getSession(data.sessionId);
          if (session) {
            this.sessionManager.addClient(data.sessionId, clientId);
            ws.sessionId = data.sessionId;
            
            // Send session info and scrollback buffer
            ws.send(JSON.stringify({
              type: 'connect',
              sessionId: data.sessionId,
              session,
              scrollback: this.bufferManager.getBuffer(data.sessionId),
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Session not found',
            }));
          }
        }
        break;

      case 'input':
        if (data.sessionId && data.data) {
          this.sessionManager.writeToSession(data.sessionId, data.data);
        }
        break;

      case 'resize':
        if (data.sessionId && data.cols && data.rows) {
          this.sessionManager.resizeSession(data.sessionId, data.cols, data.rows);
          // Broadcast resize to all clients
          this.broadcastToSession(data.sessionId, {
            type: 'resize',
            sessionId: data.sessionId,
            cols: data.cols,
            rows: data.rows,
          });
        }
        break;

      case 'disconnect':
        if (data.sessionId) {
          this.sessionManager.removeClient(data.sessionId, clientId);
          ws.sessionId = undefined;
        }
        break;
    }
  }

  private broadcastToSession(sessionId: string, data: any): void {
    this.clients.forEach((ws, clientId) => {
      if (ws.sessionId === sessionId && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
}