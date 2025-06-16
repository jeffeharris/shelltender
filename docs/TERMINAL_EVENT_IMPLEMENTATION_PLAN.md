# Terminal Event System Implementation Plan

## Overview
Step-by-step plan to implement the generic terminal event system for shelltender.

## Phase 1: Core Infrastructure (Backend)

### 1.1 Pattern Types and Interfaces
**File**: `packages/core/src/types/events.ts`
```typescript
export interface PatternConfig {
  name: string;
  type: 'regex' | 'string' | 'ansi' | 'custom';
  pattern: string | RegExp | CustomMatcher;
  options?: PatternOptions;
}

export interface TerminalEvent {
  type: string;
  sessionId: string;
  timestamp: number;
  data: any;
}

export interface PatternMatch {
  pattern: string;
  match: string;
  position: number;
  groups?: Record<string, string>;
}
```

### 1.2 Pattern Matcher Implementation
**File**: `packages/server/src/patterns/PatternMatcher.ts`
- Base PatternMatcher class
- RegexMatcher extends PatternMatcher
- StringMatcher extends PatternMatcher
- AnsiMatcher extends PatternMatcher
- CustomMatcher extends PatternMatcher

### 1.3 Event Manager
**File**: `packages/server/src/events/EventManager.ts`
```typescript
class EventManager {
  private patterns: Map<string, PatternMatcher>;
  private subscriptions: Map<string, Set<EventCallback>>;
  
  registerPattern(config: PatternConfig): string;
  unregisterPattern(patternId: string): void;
  processData(sessionId: string, data: string): void;
  subscribe(callback: EventCallback): () => void;
}
```

### 1.4 Integration with BufferManager
**File**: `packages/server/src/BufferManager.ts`
- Add EventManager instance
- Call eventManager.processData() when new data arrives
- Emit events through WebSocket
- See [BufferManager Event Integration](./BUFFERMANAGER_EVENT_INTEGRATION.md) for detailed implementation

## Phase 2: WebSocket Protocol

### 2.1 New Message Types
**File**: `packages/core/src/types/messages.ts`
```typescript
// Client -> Server
interface RegisterPatternMessage {
  type: 'register-pattern';
  sessionId: string;
  config: PatternConfig;
}

// Server -> Client
interface PatternRegisteredMessage {
  type: 'pattern-registered';
  patternId: string;
}

interface TerminalEventMessage {
  type: 'terminal-event';
  event: TerminalEvent;
}
```

### 2.2 WebSocket Handler Updates
**File**: `packages/server/src/WebSocketServer.ts`
- Handle 'register-pattern' messages
- Handle 'unregister-pattern' messages
- Broadcast terminal events to subscribed clients

## Phase 3: Client SDK

### 3.1 Update WebSocketService
**File**: `packages/client/src/services/WebSocketService.ts`

The existing WebSocketService needs to be updated to support multiple message handlers:
- Change from single `onMessageHandler` to event emitter pattern
- Support typed message handling for different message types
- Update type from `TerminalData` to `WebSocketMessage` for broader support

```typescript
import type { WebSocketMessage } from '@shelltender/core';

type MessageHandler = (data: any) => void;

export class WebSocketService {
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  
  // Add event emitter methods
  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }
  
  off(type: string, handler: MessageHandler): void {
    this.messageHandlers.get(type)?.delete(handler);
  }
  
  // Update message handling
  private handleMessage(data: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  // Update send method to accept WebSocketMessage
  send(data: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }
}
```

**Key Changes Needed:**
1. Replace `onMessageHandler` with event emitter pattern using `Map<string, Set<MessageHandler>>`
2. Add `on()` and `off()` methods for subscribing to specific message types
3. Update `onmessage` handler to dispatch to registered handlers based on message type
4. Change message type from `TerminalData` to `WebSocketMessage`
5. Update `send()` method signature to accept `WebSocketMessage`

### 3.2 TerminalEventService Implementation
**File**: `packages/client/src/services/TerminalEventService.ts`

Implement with request/response correlation and timeout handling:

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

    // Listen for pattern unregistration responses
    this.ws.on('pattern-unregistered', (data: any) => {
      const request = this.pendingRequests.get(data.requestId);
      if (request) {
        request.resolve(true);
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

**Key Features:**
- Request/response correlation using `requestId`
- Timeout handling (10 seconds) for async operations
- Error handling with proper cleanup
- Session-specific event filtering
- Multiple event type subscriptions

### 3.3 React Hook Implementation
**File**: `packages/client/src/hooks/useTerminalEvents.ts`

Hook with automatic cleanup and connection management:

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

**Key Features:**
- Automatic cleanup on unmount
- Pattern registry tracking
- Connection state awareness
- Error handling with service initialization checks
- Session-specific event filtering

### 3.4 Example Component Implementation
**File**: `packages/client/src/components/TerminalEventMonitor.tsx`

Fully functional monitoring component for demo/debugging:

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

### 3.5 Integration Steps

1. **Update WebSocketService**: 
   - Modify existing service to support event emitter pattern
   - Ensure backward compatibility with existing terminal data handling
   - Test WebSocket reconnection with new message types

2. **Export from Package**:
   - Add exports to `packages/client/src/index.ts`:
   ```typescript
   export { TerminalEventService } from './services/TerminalEventService';
   export { useTerminalEvents } from './hooks/useTerminalEvents';
   export { TerminalEventMonitor } from './components/TerminalEventMonitor';
   ```

3. **Add to Terminal Component** (Optional):
   - Integrate event monitor as collapsible panel
   - Add toggle button in terminal header
   - Store monitor state in localStorage

4. **Update Type Exports**:
   - Ensure all event types are exported from @shelltender/core
   - Add WebSocketMessage union type for all message types

5. **Documentation Updates**:
   - Update TERMINAL_EVENTS_API.md to remove "coming soon" notices
   - Add usage examples to package README files
   - Create migration guide for WebSocketService changes

## Phase 4: Built-in Patterns

### 4.1 Common Pattern Library
**File**: `packages/server/src/patterns/CommonPatterns.ts`
```typescript
export const COMMON_PATTERNS = {
  errors: {
    javascript: /Error:|TypeError:|ReferenceError:/,
    python: /Traceback|SyntaxError:|ValueError:/,
    general: /error:|failed:|Error:/i
  },
  prompts: {
    bash: /\$\s*$/,
    zsh: /[%>]\s*$/,
    generic: /[>$%#]\s*$/
  },
  progress: {
    percentage: /(\d+)%/,
    npm: /⸨+⸩+/,
    dots: /\.{3,}/
  }
};
```

## Phase 5: Testing

### 5.1 Unit Tests

**Pattern Matcher Tests** (`tests/server/patterns/PatternMatcher.test.ts`)
```typescript
describe('PatternMatcher', () => {
  describe('RegexMatcher', () => {
    it('should match simple patterns', () => {
      const matcher = new RegexMatcher(/error:/i);
      const result = matcher.match('Error: file not found');
      expect(result).toBeTruthy();
      expect(result.match).toBe('Error:');
    });
    
    it('should extract groups', () => {
      const matcher = new RegexMatcher(/(\d+) of (\d+)/);
      const result = matcher.match('Processing 5 of 10');
      expect(result.groups).toEqual({ '1': '5', '2': '10' });
    });
  });
});
```

**Event Manager Tests** (`tests/server/events/EventManager.test.ts`)
```typescript
describe('EventManager', () => {
  it('should register and match patterns', () => {
    const manager = new EventManager();
    const patternId = manager.registerPattern({
      name: 'error',
      type: 'regex',
      pattern: /error/i
    });
    
    const events: TerminalEvent[] = [];
    manager.subscribe((event) => events.push(event));
    
    manager.processData('session1', 'Error: test failed');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('pattern-match');
  });
});
```

### 5.2 Integration Tests

**WebSocket Event Flow** (`tests/integration/terminal-events.test.ts`)
```typescript
describe('Terminal Events Integration', () => {
  it('should flow from pattern registration to event delivery', async () => {
    const { server, client } = await setupTestEnvironment();
    
    // Register pattern
    const patternId = await client.registerPattern({
      name: 'build-complete',
      type: 'regex',
      pattern: /Build complete/
    });
    
    // Subscribe to events
    const events: TerminalEvent[] = [];
    client.subscribe(['pattern-match'], (event) => {
      events.push(event);
    });
    
    // Simulate terminal output
    server.sessionManager.getSession('test').write('Build complete in 2.3s');
    
    // Verify event received
    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0].data.match).toBe('Build complete');
  });
});
```

### 5.3 Performance Tests

**Pattern Matching Performance** (`tests/performance/pattern-performance.test.ts`)
```typescript
describe('Pattern Performance', () => {
  it('should handle high-throughput data', () => {
    const manager = new EventManager();
    
    // Register 100 patterns
    for (let i = 0; i < 100; i++) {
      manager.registerPattern({
        name: `pattern-${i}`,
        type: 'regex',
        pattern: new RegExp(`pattern${i}`)
      });
    }
    
    // Process 10,000 lines
    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      manager.processData('session1', `Line ${i} with pattern42 data`);
    }
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should process in < 1 second
  });
});
```

## Phase 6: Demo and Documentation

### 6.1 Demo App Updates
- Add pattern detection examples
- Show real-time event visualization
- Include performance metrics

### 6.2 API Documentation
- Complete API reference
- Pattern cookbook with examples
- Performance guidelines

## Timeline Estimate

- **Phase 1**: Core Infrastructure (2-3 days)
- **Phase 2**: WebSocket Protocol (1-2 days)
- **Phase 3**: Client SDK (2 days)
- **Phase 4**: Built-in Patterns (1 day)
- **Phase 5**: Testing (2-3 days)
- **Phase 6**: Demo and Docs (1-2 days)

**Total**: 9-13 days

## Success Criteria

1. Pattern registration and matching works reliably
2. Events flow in real-time via WebSocket
3. Performance handles 1000+ patterns without lag
4. Client SDK provides intuitive API
5. Test coverage > 80%
6. Demo app showcases key use cases