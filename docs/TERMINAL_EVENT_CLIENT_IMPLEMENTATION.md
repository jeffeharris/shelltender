# Terminal Event System - Client Implementation Guide

## Overview
This guide details the implementation of client-side components for the Terminal Event System. The server-side is complete and tested, but the client-side needs to be built.

## Components to Implement

### 1. TerminalEventService (`packages/client/src/services/TerminalEventService.ts`)

```typescript
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
      }
    });

    // Listen for terminal events
    this.ws.on('terminal-event', (data: any) => {
      this.handleTerminalEvent(data.event);
    });

    // Handle errors
    this.ws.on('error', (data: any) => {
      const request = this.pendingRequests.get(data.requestId);
      if (request) {
        request.reject(new Error(data.data));
        this.pendingRequests.delete(data.requestId);
      }
    });
  }

  async registerPattern(sessionId: string, config: PatternConfig): Promise<string> {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    
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
    const requestId = `req-${Date.now()}-${Math.random()}`;
    
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
    // Subscribe to specific event types
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
}
```

### 2. React Hook (`packages/client/src/hooks/useTerminalEvents.ts`)

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { TerminalEventService } from '../services/TerminalEventService';
import { PatternConfig, AnyTerminalEvent } from '@shelltender/core';

export interface UseTerminalEventsReturn {
  events: AnyTerminalEvent[];
  registerPattern: (config: PatternConfig) => Promise<string>;
  unregisterPattern: (patternId: string) => Promise<void>;
  clearEvents: () => void;
  isConnected: boolean;
}

export function useTerminalEvents(sessionId: string): UseTerminalEventsReturn {
  const { wsService, isConnected } = useWebSocket();
  const [events, setEvents] = useState<AnyTerminalEvent[]>([]);
  const eventServiceRef = useRef<TerminalEventService>();
  const registeredPatterns = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!wsService || !isConnected) return;

    // Create event service
    const eventService = new TerminalEventService(wsService);
    eventServiceRef.current = eventService;

    // Subscribe to events for this session
    const unsubscribe = eventService.subscribeToSession(sessionId, (event) => {
      setEvents(prev => [...prev, event]);
    });

    return () => {
      unsubscribe();
      // Cleanup registered patterns
      registeredPatterns.current.forEach(patternId => {
        eventService.unregisterPattern(patternId).catch(console.error);
      });
      registeredPatterns.current.clear();
    };
  }, [wsService, isConnected, sessionId]);

  const registerPattern = useCallback(async (config: PatternConfig) => {
    if (!eventServiceRef.current) {
      throw new Error('Event service not initialized');
    }

    const patternId = await eventServiceRef.current.registerPattern(sessionId, config);
    registeredPatterns.current.add(patternId);
    return patternId;
  }, [sessionId]);

  const unregisterPattern = useCallback(async (patternId: string) => {
    if (!eventServiceRef.current) {
      throw new Error('Event service not initialized');
    }

    await eventServiceRef.current.unregisterPattern(patternId);
    registeredPatterns.current.delete(patternId);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    registerPattern,
    unregisterPattern,
    clearEvents,
    isConnected
  };
}
```

### 3. Example Component (`packages/client/src/components/TerminalEventMonitor.tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import { useTerminalEvents } from '../../hooks/useTerminalEvents';
import { PatternMatchEvent } from '@shelltender/core';

interface Props {
  sessionId: string;
}

export const TerminalEventMonitor: React.FC<Props> = ({ sessionId }) => {
  const { events, registerPattern, clearEvents } = useTerminalEvents(sessionId);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!isMonitoring) return;

    const setupPatterns = async () => {
      try {
        // Register error pattern
        await registerPattern({
          name: 'error-detector',
          type: 'regex',
          pattern: /error:|failed:/i,
          options: { debounce: 100 }
        });

        // Register success pattern
        await registerPattern({
          name: 'success-detector',
          type: 'regex',
          pattern: /success|completed|done/i,
          options: { debounce: 100 }
        });
      } catch (error) {
        console.error('Failed to register patterns:', error);
      }
    };

    setupPatterns();
  }, [isMonitoring, registerPattern]);

  const errorEvents = events.filter(e => 
    e.type === 'pattern-match' && 
    (e as PatternMatchEvent).patternName === 'error-detector'
  );

  const successEvents = events.filter(e => 
    e.type === 'pattern-match' && 
    (e as PatternMatchEvent).patternName === 'success-detector'
  );

  return (
    <div className="terminal-event-monitor">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Event Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-3 py-1 rounded ${
              isMonitoring ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          <button
            onClick={clearEvents}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <h4 className="font-semibold text-red-600 mb-2">
            Errors ({errorEvents.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {errorEvents.map((event, i) => (
              <div key={i} className="text-sm">
                {(event as PatternMatchEvent).match}
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded p-3">
          <h4 className="font-semibold text-green-600 mb-2">
            Success ({successEvents.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {successEvents.map((event, i) => (
              <div key={i} className="text-sm">
                {(event as PatternMatchEvent).match}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Testing

### Unit Tests for TerminalEventService

```typescript
// packages/client/src/services/__tests__/TerminalEventService.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TerminalEventService } from '../TerminalEventService';
import { WebSocketService } from '../WebSocketService';

describe('TerminalEventService', () => {
  let mockWs: any;
  let service: TerminalEventService;

  beforeEach(() => {
    mockWs = {
      send: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
    service = new TerminalEventService(mockWs);
  });

  describe('registerPattern', () => {
    it('should send register pattern message and return patternId', async () => {
      const config = {
        name: 'test',
        type: 'regex' as const,
        pattern: /test/
      };

      // Simulate successful response
      setTimeout(() => {
        const handler = mockWs.on.mock.calls.find(
          call => call[0] === 'pattern-registered'
        )?.[1];
        handler?.({ patternId: 'pattern-123', requestId: expect.any(String) });
      }, 10);

      const patternId = await service.registerPattern('session-1', config);

      expect(mockWs.send).toHaveBeenCalledWith({
        type: 'register-pattern',
        sessionId: 'session-1',
        config,
        requestId: expect.any(String)
      });
      expect(patternId).toBe('pattern-123');
    });
  });

  describe('subscribe', () => {
    it('should handle incoming events', () => {
      const callback = vi.fn();
      service.subscribe(['pattern-match'], callback);

      // Simulate event handler
      const handler = mockWs.on.mock.calls.find(
        call => call[0] === 'terminal-event'
      )?.[1];

      const mockEvent = {
        type: 'pattern-match',
        sessionId: 'session-1',
        timestamp: Date.now(),
        match: 'test'
      };

      handler?.({ event: mockEvent });

      expect(callback).toHaveBeenCalledWith(mockEvent);
    });
  });
});
```

## Integration Steps

1. **Add to WebSocketService** - Ensure message types are handled
2. **Export from package** - Add to `packages/client/src/index.ts`
3. **Add to Terminal component** - Optional event monitor panel
4. **Documentation** - Update API docs to remove "coming soon"

## Timeline

- TerminalEventService: 2-3 hours
- React Hook: 1-2 hours  
- Example Component: 1-2 hours
- Tests: 2-3 hours
- Integration: 1-2 hours

**Total: 7-12 hours**