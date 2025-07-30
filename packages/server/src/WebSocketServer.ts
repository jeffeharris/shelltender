import { WebSocketServer as WSServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import { SessionManager } from './SessionManager.js';
import { BufferManager } from './BufferManager.js';
import { SessionStore } from './SessionStore.js';
import { EventManager } from './events/EventManager.js';
import { AdminSessionProxy } from './admin/AdminSessionProxy.js';
import { 
  TerminalData, 
  WebSocketMessage,
  RegisterPatternMessage,
  UnregisterPatternMessage,
  SubscribeEventsMessage,
  UnsubscribeEventsMessage,
  TerminalEventMessage
} from '@shelltender/core';

export interface WebSocketServerOptions {
  port?: number;
  server?: HTTPServer | HTTPSServer;
  noServer?: boolean;
  host?: string;
  path?: string;
  perMessageDeflate?: boolean | object;
  maxPayload?: number;
  clientTracking?: boolean;
}

interface ClientState {
  clientId: string;
  sessionIds: Set<string>;
  lastReceivedSequence: Map<string, number>;
  connectionTime: number;
  isIncrementalClient: boolean;
}

export class WebSocketServer {
  private wss: WSServer;
  private sessionManager: SessionManager;
  private bufferManager: BufferManager;
  private sessionStore?: SessionStore;
  private eventManager?: EventManager;
  private clients: Map<string, any> = new Map();
  private clientStates: Map<string, ClientState> = new Map();
  private clientPatterns = new Map<string, Set<string>>();
  private clientEventSubscriptions = new Map<string, Set<string>>();
  private monitorClients = new Set<string>();
  private adminProxy: AdminSessionProxy;
  private adminClients: Map<string, Set<any>> = new Map();

  private constructor(
    wss: WSServer,
    sessionManager: SessionManager, 
    bufferManager: BufferManager, 
    eventManager?: EventManager,
    sessionStore?: SessionStore
  ) {
    this.wss = wss;
    this.sessionManager = sessionManager;
    this.bufferManager = bufferManager;
    this.eventManager = eventManager;
    this.sessionStore = sessionStore;
    this.adminProxy = new AdminSessionProxy(this.sessionManager);

    // Set up event system if available
    if (this.eventManager) {
      this.setupEventSystem();
    }

    this.setupWebSocketHandlers();
  }

  static create(
    config: number | WebSocketServerOptions,
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore
  ): WebSocketServer {
    let wss: WSServer;

    if (typeof config === 'number') {
      // Legacy: port number only
      wss = new WSServer({ port: config, host: '0.0.0.0' });
    } else {
      const { server, port, noServer, path, ...wsOptions } = config;
      
      if (server && path) {
        // When both server and path are provided, use noServer mode and handle upgrade manually
        wss = new WSServer({ noServer: true, ...wsOptions });
        
        // Set up the upgrade handler on the HTTP server
        server.on('upgrade', function upgrade(request, socket, head) {
          // Handle socket errors
          socket.on('error', (err) => {
            console.error('Socket error:', err);
          });
          
          const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
          
          if (pathname === path) {
            wss.handleUpgrade(request, socket, head, function done(ws) {
              wss.emit('connection', ws, request);
            });
          } else {
            // Destroy the socket if the path doesn't match
            socket.destroy();
          }
        });
      } else if (server) {
        // Attach to existing HTTP/HTTPS server (all paths)
        wss = new WSServer({ server, ...wsOptions });
      } else if (noServer) {
        // No server mode for manual upgrade handling
        wss = new WSServer({ noServer: true, ...wsOptions });
      } else if (port !== undefined) {
        // Standalone server with options
        wss = new WSServer({ 
          port, 
          host: wsOptions.host || '0.0.0.0',
          ...wsOptions 
        });
      } else {
        throw new Error('WebSocketServer requires either port, server, or noServer option');
      }
    }

    return new WebSocketServer(wss, sessionManager, bufferManager, eventManager, sessionStore);
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws) => {
      const clientId = Math.random().toString(36).substring(7);
      this.clients.set(clientId, ws);
      
      // Initialize client state
      this.clientStates.set(clientId, {
        clientId,
        sessionIds: new Set(),
        lastReceivedSequence: new Map(),
        connectionTime: Date.now(),
        isIncrementalClient: false
      });

      ws.on('message', (message: string) => {
        try {
          const data: WebSocketMessage = JSON.parse(message);
          this.handleMessage(clientId, ws, data);
        } catch (error) {
          // Error parsing message
          ws.send(JSON.stringify({ type: 'error', data: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        // Remove client from all subscribed sessions
        const clientState = this.clientStates.get(clientId);
        if (clientState) {
          clientState.sessionIds.forEach(sessionId => {
            this.sessionManager.removeClient(sessionId, clientId);
          });
        }
        
        // Clean up event subscriptions and patterns
        if (this.eventManager) {
          const patterns = this.clientPatterns.get(clientId);
          if (patterns) {
            for (const patternId of patterns) {
              this.eventManager.unregisterPattern(patternId).catch(err => {
                // Error unregistering pattern
              });
            }
          }
        }
        
        // Clean up admin client connections
        this.adminClients.forEach((adminSet, sessionId) => {
          adminSet.delete(ws);
          if (adminSet.size === 0) {
            this.adminClients.delete(sessionId);
          }
        });
        
        this.clients.delete(clientId);
        this.clientStates.delete(clientId);
        this.clientPatterns.delete(clientId);
        this.clientEventSubscriptions.delete(clientId);
        this.monitorClients.delete(clientId);
      });

      ws.on('error', (error) => {
        // WebSocket error occurred
      });
    });
  }

  private handleMessage(clientId: string, ws: any, data: WebSocketMessage): void {
    // Check if it's an admin message first
    if (data.type.startsWith('admin-')) {
      this.handleAdminMessage(clientId, ws, data as any);
      return;
    }

    const handlers: Record<string, (clientId: string, ws: any, data: any) => void> = {
      'create': this.handleCreateSession.bind(this),
      'connect': this.handleConnectSession.bind(this),
      'input': this.handleSessionInput.bind(this),
      'resize': this.handleSessionResize.bind(this),
      'disconnect': this.handleSessionDisconnect.bind(this),
      'register-pattern': this.handleRegisterPattern.bind(this),
      'unregister-pattern': this.handleUnregisterPattern.bind(this),
      'subscribe-events': this.handleSubscribeEvents.bind(this),
      'unsubscribe-events': this.handleUnsubscribeEvents.bind(this),
      'monitor-all': this.handleMonitorAll.bind(this),
    };

    const handler = handlers[data.type];
    if (handler) {
      handler(clientId, ws, data);
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        data: `Unknown message type: ${data.type}`,
      }));
    }
  }

  private handleCreateSession(clientId: string, ws: any, data: any): void {
    try {
      const options = data.options || {};
      if (data.cols) options.cols = data.cols;
      if (data.rows) options.rows = data.rows;
      
      // Handle sessionId from either location
      const requestedSessionId = data.sessionId || (data.options && data.options.id);
      if (requestedSessionId) {
        options.id = requestedSessionId;
        
        // Check if session already exists
        const existingSession = this.sessionManager.getSession(requestedSessionId);
        if (existingSession) {
          // Session already exists, just connect to it
          this.sessionManager.addClient(requestedSessionId, clientId);
          
          // Add session to client's subscribed sessions
          const clientState = this.clientStates.get(clientId);
          if (clientState) {
            clientState.sessionIds.add(requestedSessionId);
          }
          
          const response = {
            type: 'created',
            sessionId: requestedSessionId,
            session: existingSession,
          };
          ws.send(JSON.stringify(response));
          return;
        }
      }
      
      const session = this.sessionManager.createSession(options);
      
      this.sessionManager.addClient(session.id, clientId);
      
      // Add session to client's subscribed sessions
      const clientState = this.clientStates.get(clientId);
      if (clientState) {
        clientState.sessionIds.add(session.id);
      }
      
      const response = {
        type: 'created',
        sessionId: session.id,
        session,
      };
      ws.send(JSON.stringify(response));
    } catch (error) {
      console.error('[WebSocketServer] Error creating session:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error instanceof Error ? error.message : 'Failed to create session',
        requestId: data.requestId
      }));
    }
  }

  private handleConnectSession(clientId: string, ws: any, data: any): void {
    if (!data.sessionId) {
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Session ID required',
      }));
      return;
    }

    const session = this.sessionManager.getSession(data.sessionId);
    if (session) {
      this.sessionManager.addClient(data.sessionId, clientId);
      
      const clientState = this.clientStates.get(clientId);
      if (!clientState) {
        ws.send(JSON.stringify({
          type: 'error',
          data: 'Client state not found',
        }));
        return;
      }

      // Add session to client's subscribed sessions
      clientState.sessionIds.add(data.sessionId);
      
      // Check if client wants incremental updates
      const useIncremental = data.useIncrementalUpdates === true || data.incremental === true;
      clientState.isIncrementalClient = useIncremental;

      let response: any = {
        type: 'connect',
        sessionId: data.sessionId,
        session,
      };

      if (useIncremental && data.lastSequence !== undefined) {
        // Client supports incremental updates and has a sequence
        const lastClientSequence = data.lastSequence;
        const { data: incrementalData, lastSequence } = this.bufferManager.getIncrementalData(
          data.sessionId, 
          lastClientSequence
        );
        
        if (incrementalData) {
          response.incrementalData = incrementalData;
          response.fromSequence = lastClientSequence;
          response.lastSequence = lastSequence;
        } else {
          // No new data
          response.lastSequence = lastClientSequence;
        }
        
        clientState.lastReceivedSequence.set(data.sessionId, lastSequence);
      } else {
        // Legacy behavior or first connection
        const { data: scrollback, lastSequence } = this.bufferManager.getBufferWithSequence(data.sessionId);
        response.scrollback = scrollback;
        response.lastSequence = lastSequence;
        
        if (useIncremental) {
          clientState.lastReceivedSequence.set(data.sessionId, lastSequence);
        }
      }
      
      ws.send(JSON.stringify(response));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Session not found',
      }));
    }
  }

  private handleSessionInput(clientId: string, ws: any, data: any): void {
    if (!data.sessionId || !data.data) {
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Session ID and data required',
      }));
      return;
    }

    const success = this.sessionManager.writeToSession(data.sessionId, data.data);
    if (!success) {
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Failed to write to session - session may be disconnected',
        sessionId: data.sessionId
      }));
    }
  }

  private handleSessionResize(clientId: string, ws: any, data: any): void {
    if (!data.sessionId || !data.cols || !data.rows) {
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Session ID, cols, and rows required',
      }));
      return;
    }

    this.sessionManager.resizeSession(data.sessionId, data.cols, data.rows);
    this.broadcastToSession(data.sessionId, {
      type: 'resize',
      sessionId: data.sessionId,
      cols: data.cols,
      rows: data.rows,
    });
  }

  private handleSessionDisconnect(clientId: string, ws: any, data: any): void {
    if (data.sessionId) {
      this.sessionManager.removeClient(data.sessionId, clientId);
      
      // Remove session from client's subscribed sessions
      const clientState = this.clientStates.get(clientId);
      if (clientState) {
        clientState.sessionIds.delete(data.sessionId);
        clientState.lastReceivedSequence.delete(data.sessionId);
      }
    }
  }

  private async handleAdminMessage(
    clientId: string, 
    ws: any, 
    message: any
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'admin-list-sessions':
          const sessions = this.sessionManager.getAllSessionMetadata();
          ws.send(JSON.stringify({ 
            type: 'admin-sessions-list', 
            sessions 
          }));
          break;
          
        case 'admin-attach':
          if (!message.sessionId) return;
          
          await this.adminProxy.attachToSession(message.sessionId, message.mode);
          
          // Track this admin client
          if (!this.adminClients.has(message.sessionId)) {
            this.adminClients.set(message.sessionId, new Set());
          }
          this.adminClients.get(message.sessionId)!.add(ws);
          
          // Send current buffer
          const buffer = this.bufferManager.getBuffer(message.sessionId);
          ws.send(JSON.stringify({
            type: 'buffer',
            sessionId: message.sessionId,
            data: buffer
          }));
          break;
          
        case 'admin-detach':
          if (!message.sessionId) return;
          
          await this.adminProxy.detachFromSession(message.sessionId);
          this.adminClients.get(message.sessionId)?.delete(ws);
          break;
          
        case 'admin-input':
          if (!message.sessionId || !message.data) return;
          
          await this.adminProxy.writeToSession(message.sessionId, message.data);
          break;
      }
    } catch (error: any) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  public broadcastToSession(sessionId: string, data: any): void {
    // Send to clients connected to this session
    this.clients.forEach((ws, clientId) => {
      const clientState = this.clientStates.get(clientId);
      if (clientState && clientState.sessionIds.has(sessionId) && ws.readyState === ws.OPEN) {
        // Update client's sequence tracking if this is output data with a sequence
        if (data.type === 'output' && data.sequence !== undefined) {
          if (clientState.isIncrementalClient) {
            clientState.lastReceivedSequence.set(sessionId, data.sequence);
          }
        }
        ws.send(JSON.stringify(data));
      }
    });

    // Also send to monitor clients with session information
    if (data.type === 'output' && this.monitorClients.size > 0) {
      const monitorMessage = {
        type: 'session-output',
        sessionId,
        data: data.data,
        timestamp: new Date().toISOString()
      };

      this.monitorClients.forEach(monitorId => {
        const ws = this.clients.get(monitorId);
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(monitorMessage));
        }
      });
    }

    // Send to admin viewers
    const adminViewers = this.adminClients.get(sessionId);
    if (adminViewers && adminViewers.size > 0) {
      const adminData = JSON.stringify(data);
      adminViewers.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          ws.send(adminData);
        }
      });
    }
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

  private handleMonitorAll(clientId: string, ws: any, data: any): void {
    // Check authentication
    const authKey = data.authKey || data.auth;
    const expectedAuthKey = process.env.SHELLTENDER_MONITOR_AUTH_KEY || 'default-monitor-key';
    
    if (authKey !== expectedAuthKey) {
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Invalid authentication key for monitor mode',
        requestId: data.requestId
      }));
      return;
    }

    // Add to monitor clients
    this.monitorClients.add(clientId);
    ws.isMonitor = true;

    ws.send(JSON.stringify({
      type: 'monitor-mode-enabled',
      message: 'Successfully enabled monitor mode. You will receive all terminal output.',
      sessionCount: this.sessionManager.getAllSessions().length
    }));
  }

  // Get number of clients connected to a specific session
  public getSessionClientCount(sessionId: string): number {
    let count = 0;
    this.clients.forEach((ws, clientId) => {
      const clientState = this.clientStates.get(clientId);
      if (clientState && clientState.sessionIds.has(sessionId) && ws.readyState === ws.OPEN) {
        count++;
      }
    });
    return count;
  }

  // Get all client connections grouped by session
  public getClientsBySession(): Map<string, number> {
    const sessionClients = new Map<string, number>();
    this.clients.forEach((ws, clientId) => {
      const clientState = this.clientStates.get(clientId);
      if (clientState && ws.readyState === ws.OPEN) {
        // Count each session the client is subscribed to
        clientState.sessionIds.forEach(sessionId => {
          sessionClients.set(sessionId, (sessionClients.get(sessionId) || 0) + 1);
        });
      }
    });
    return sessionClients;
  }
}