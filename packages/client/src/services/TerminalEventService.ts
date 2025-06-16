import { WebSocketService } from './WebSocketService';
import { PatternConfig, AnyTerminalEvent } from '@shelltender/core';

export type EventCallback = (event: AnyTerminalEvent) => void;
export type UnsubscribeFn = () => void;

export class TerminalEventService {
  private eventSubscriptions = new Map<string, Set<EventCallback>>();
  private patternRegistry = new Map<string, string>(); // patternId -> sessionId
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  constructor(private ws: WebSocketService) {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    // Listen for pattern registration responses
    this.ws.on('pattern-registered', (data: any) => {
      const request = this.pendingRequests.get(data.requestId);
      if (request) {
        request.resolve(data.patternId);
        this.pendingRequests.delete(data.requestId);
        // Track pattern
        if (data.sessionId) {
          this.patternRegistry.set(data.patternId, data.sessionId);
        }
      }
    });

    // Listen for pattern unregistration responses
    this.ws.on('pattern-unregistered', (data: any) => {
      const request = this.pendingRequests.get(data.requestId);
      if (request) {
        request.resolve(true);
        this.pendingRequests.delete(data.requestId);
        // Remove from registry
        this.patternRegistry.delete(data.patternId);
      }
    });

    // Listen for get patterns responses
    this.ws.on('patterns-list', (data: any) => {
      const request = this.pendingRequests.get(data.requestId);
      if (request) {
        request.resolve(data.patterns || []);
        this.pendingRequests.delete(data.requestId);
      }
    });

    // Listen for terminal events
    this.ws.on('terminal-event', (data: any) => {
      this.handleTerminalEvent(data.event);
    });

    // Handle errors
    this.ws.on('error', (data: any) => {
      if (data.requestId) {
        const request = this.pendingRequests.get(data.requestId);
        if (request) {
          request.reject(new Error(data.data || data.message || 'Unknown error'));
          this.pendingRequests.delete(data.requestId);
        }
      } else {
        // Emit general error event
        this.handleTerminalEvent({
          type: 'error',
          sessionId: data.sessionId || 'unknown',
          timestamp: Date.now(),
          error: data.message || data.data || data
        } as any);
      }
    });
  }

  async registerPattern(sessionId: string, config: PatternConfig): Promise<string> {
    // Validate pattern before sending
    this.validatePattern(config);
    
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.ws.send({
        type: 'register-pattern',
        sessionId,
        config,
        requestId
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Pattern registration timeout'));
        }
      }, 10000);
    });
  }

  async unregisterPattern(patternId: string): Promise<void> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.ws.send({
        type: 'unregister-pattern',
        patternId,
        requestId
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Pattern unregistration timeout'));
        }
      }, 10000);
    });
  }

  subscribe(eventTypes: string[], callback: EventCallback): UnsubscribeFn {
    // Subscribe locally
    eventTypes.forEach(type => {
      if (!this.eventSubscriptions.has(type)) {
        this.eventSubscriptions.set(type, new Set());
      }
      this.eventSubscriptions.get(type)!.add(callback);
    });

    // Tell server we want to receive events
    this.ws.send({
      type: 'subscribe-events',
      eventTypes
    });

    // Return unsubscribe function
    return () => {
      eventTypes.forEach(type => {
        this.eventSubscriptions.get(type)?.delete(callback);
      });

      // Tell server if no more listeners for these types
      const remainingTypes = eventTypes.filter(type => {
        const callbacks = this.eventSubscriptions.get(type);
        return callbacks && callbacks.size > 0;
      });

      if (remainingTypes.length < eventTypes.length) {
        this.ws.send({
          type: 'unsubscribe-events',
          eventTypes: eventTypes.filter(t => !remainingTypes.includes(t))
        });
      }
    };
  }

  private handleTerminalEvent(event: AnyTerminalEvent): void {
    const callbacks = this.eventSubscriptions.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  // Helper method to subscribe to pattern matches for a specific session
  subscribeToSession(sessionId: string, callback: EventCallback): UnsubscribeFn {
    const wrappedCallback = (event: AnyTerminalEvent) => {
      if (event.sessionId === sessionId) {
        callback(event);
      }
    };

    return this.subscribe(['pattern-match', 'ansi-sequence'], wrappedCallback);
  }

  // Get all registered patterns for a session
  getPatternsForSession(sessionId: string): string[] {
    const patterns: string[] = [];
    this.patternRegistry.forEach((sid, patternId) => {
      if (sid === sessionId) {
        patterns.push(patternId);
      }
    });
    return patterns;
  }

  // Validate pattern configuration
  private validatePattern(config: PatternConfig): void {
    if (!config.name || !config.type) {
      throw new Error('Pattern must have name and type');
    }

    if (config.type === 'regex' && typeof config.pattern === 'string') {
      try {
        new RegExp(config.pattern);
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${(e as Error).message}`);
      }
    }

    if (config.type === 'string' && typeof config.pattern !== 'string') {
      throw new Error('String pattern must be a string');
    }

    // Let server do deep validation for custom and ANSI patterns
  }

  // Get registered patterns for a session
  async getPatterns(sessionId: string): Promise<Array<{ patternId: string; config: PatternConfig; sessionId: string }>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.ws.send({
        type: 'get-patterns',
        sessionId,
        requestId
      } as any);

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Get patterns timeout'));
        }
      }, 10000);
    });
  }
}