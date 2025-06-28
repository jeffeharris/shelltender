import { WebSocketServer as WSServer } from 'ws';
import { SessionManager } from './SessionManager.js';
import { BufferManager } from './BufferManager.js';
import { SessionStore } from './SessionStore.js';
import { EventManager } from './events/EventManager.js';
import { 
  TerminalData, 
  WebSocketMessage,
  RegisterPatternMessage,
  UnregisterPatternMessage,
  SubscribeEventsMessage,
  UnsubscribeEventsMessage,
  TerminalEventMessage
} from '@shelltender/core';

export class WebSocketServer {
  private wss: WSServer;
  private sessionManager: SessionManager;
  private bufferManager: BufferManager;
  private sessionStore?: SessionStore;
  private eventManager?: EventManager;
  private clients: Map<string, any> = new Map();
  private clientPatterns = new Map<string, Set<string>>();
  private clientEventSubscriptions = new Map<string, Set<string>>();

  constructor(
    port: number, 
    sessionManager: SessionManager, 
    bufferManager: BufferManager, 
    eventManager?: EventManager,
    sessionStore?: SessionStore
  ) {
    this.sessionManager = sessionManager;
    this.bufferManager = bufferManager;
    this.eventManager = eventManager;
    this.sessionStore = sessionStore;
    this.wss = new WSServer({ port, host: '0.0.0.0' });

    // Set up event system if available
    if (this.eventManager) {
      this.setupEventSystem();
    }

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws) => {
      const clientId = Math.random().toString(36).substring(7);
      this.clients.set(clientId, ws);

      ws.on('message', (message: string) => {
        try {
          const data: WebSocketMessage = JSON.parse(message);
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
        
        // Clean up event subscriptions and patterns
        if (this.eventManager) {
          const patterns = this.clientPatterns.get(clientId);
          if (patterns) {
            for (const patternId of patterns) {
              this.eventManager.unregisterPattern(patternId).catch(err => 
                console.error('Error unregistering pattern:', err)
              );
            }
          }
        }
        
        this.clients.delete(clientId);
        this.clientPatterns.delete(clientId);
        this.clientEventSubscriptions.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private handleMessage(clientId: string, ws: any, data: WebSocketMessage): void {
    switch (data.type) {
      case 'create':
        try {
          const options = data.options || {};
          if (data.cols) options.cols = data.cols;
          if (data.rows) options.rows = data.rows;
          
          console.log(`[WebSocketServer] Creating session with options:`, options);
          
          const session = this.sessionManager.createSession(options);
          this.sessionManager.addClient(session.id, clientId);
          ws.sessionId = session.id;
          
          ws.send(JSON.stringify({
            type: 'created',
            sessionId: session.id,
            session,
          }));
          
          console.log(`[WebSocketServer] Session ${session.id} created successfully`);
        } catch (error) {
          console.error('[WebSocketServer] Error creating session:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: error instanceof Error ? error.message : 'Failed to create session',
            requestId: (data as any).requestId
          }));
        }
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
          console.log(`[WebSocketServer] Input received for session ${data.sessionId}: ${data.data.length} bytes`);
          const success = this.sessionManager.writeToSession(data.sessionId, data.data);
          if (!success) {
            console.error(`[WebSocketServer] Failed to write to session ${data.sessionId}`);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to write to session - session may be disconnected',
              sessionId: data.sessionId
            }));
          }
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

      case 'register-pattern':
        this.handleRegisterPattern(clientId, ws, data as RegisterPatternMessage);
        break;

      case 'unregister-pattern':
        this.handleUnregisterPattern(clientId, ws, data as UnregisterPatternMessage);
        break;

      case 'subscribe-events':
        this.handleSubscribeEvents(clientId, ws, data as SubscribeEventsMessage);
        break;

      case 'unsubscribe-events':
        this.handleUnsubscribeEvents(clientId, ws, data as UnsubscribeEventsMessage);
        break;
    }
  }

  public broadcastToSession(sessionId: string, data: any): void {
    this.clients.forEach((ws, clientId) => {
      if (ws.sessionId === sessionId && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }

  private setupEventSystem(): void {
    if (!this.eventManager) return;

    // Listen for terminal events and broadcast to subscribed clients
    this.eventManager.on('terminal-event', (event) => {
      const message: TerminalEventMessage = {
        type: 'terminal-event',
        event
      };

      // Broadcast to clients subscribed to this event type
      this.clients.forEach((ws, clientId) => {
        const subscriptions = this.clientEventSubscriptions.get(clientId);
        if (subscriptions && subscriptions.has(event.type) && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    });
  }

  private async handleRegisterPattern(clientId: string, ws: any, message: RegisterPatternMessage): Promise<void> {
    if (!this.eventManager) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        data: 'Event system not enabled',
        requestId: message.requestId 
      }));
      return;
    }

    try {
      const patternId = await this.eventManager.registerPattern(message.sessionId, message.config);
      
      // Track which client registered which patterns
      if (!this.clientPatterns.has(clientId)) {
        this.clientPatterns.set(clientId, new Set());
      }
      this.clientPatterns.get(clientId)!.add(patternId);

      ws.send(JSON.stringify({
        type: 'pattern-registered',
        patternId,
        requestId: message.requestId
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        data: error instanceof Error ? error.message : 'Unknown error',
        requestId: message.requestId
      }));
    }
  }

  private async handleUnregisterPattern(clientId: string, ws: any, message: UnregisterPatternMessage): Promise<void> {
    if (!this.eventManager) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        data: 'Event system not enabled',
        requestId: message.requestId 
      }));
      return;
    }

    try {
      await this.eventManager.unregisterPattern(message.patternId);
      
      // Remove from client's pattern tracking
      const patterns = this.clientPatterns.get(clientId);
      if (patterns) {
        patterns.delete(message.patternId);
      }

      ws.send(JSON.stringify({
        type: 'pattern-unregistered',
        patternId: message.patternId,
        requestId: message.requestId
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        data: error instanceof Error ? error.message : 'Unknown error',
        requestId: message.requestId
      }));
    }
  }

  private handleSubscribeEvents(clientId: string, ws: any, message: SubscribeEventsMessage): void {
    if (!this.clientEventSubscriptions.has(clientId)) {
      this.clientEventSubscriptions.set(clientId, new Set());
    }

    const subscriptions = this.clientEventSubscriptions.get(clientId)!;
    for (const eventType of message.eventTypes) {
      subscriptions.add(eventType);
    }

    ws.send(JSON.stringify({
      type: 'subscribed',
      eventTypes: message.eventTypes
    }));
  }

  private handleUnsubscribeEvents(clientId: string, ws: any, message: UnsubscribeEventsMessage): void {
    const subscriptions = this.clientEventSubscriptions.get(clientId);
    if (subscriptions) {
      for (const eventType of message.eventTypes) {
        subscriptions.delete(eventType);
      }
    }

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      eventTypes: message.eventTypes
    }));
  }
}