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

### 3.1 Event Client Service
**File**: `packages/client/src/services/TerminalEventService.ts`
```typescript
export class TerminalEventService {
  constructor(private ws: WebSocketService) {}
  
  registerPattern(sessionId: string, config: PatternConfig): Promise<string>;
  unregisterPattern(patternId: string): Promise<void>;
  subscribe(eventTypes: string[], callback: EventCallback): () => void;
}
```

### 3.2 React Hooks
**File**: `packages/client/src/hooks/useTerminalEvents.ts`
```typescript
export function useTerminalEvents(sessionId: string) {
  const eventService = useContext(TerminalEventContext);
  
  const registerPattern = useCallback((config: PatternConfig) => {
    return eventService.registerPattern(sessionId, config);
  }, [sessionId]);
  
  const subscribe = useCallback((eventTypes: string[], callback: EventCallback) => {
    return eventService.subscribe(eventTypes, callback);
  }, []);
  
  return { registerPattern, subscribe };
}
```

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