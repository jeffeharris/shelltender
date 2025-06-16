# Terminal Event System Implementation Guide

## Quick Start for Implementation Team

This guide supplements the [Implementation Plan](./TERMINAL_EVENT_IMPLEMENTATION_PLAN.md) with practical details.

## Prerequisites

- Node.js 18+ with ESM support
- TypeScript 5.0+
- Understanding of the monorepo structure (see [ARCHITECTURE.md](./ARCHITECTURE.md))
- Familiarity with WebSocket communication

## Key Design Decisions

### 1. Why These Pattern Types?
- **regex**: Most flexible, covers 80% of use cases
- **string**: Fast exact matching, good for known outputs
- **ansi**: Specialized for terminal control sequences
- **custom**: Escape hatch for complex logic (e.g., multi-line patterns)

### 2. Performance Considerations
- Pattern matching happens on every data chunk
- Use debouncing for expensive patterns
- Consider buffer size limits (default: 10KB per pattern check)
- WebSocket broadcasts should be throttled

### 3. Memory Management
- Patterns are stored per-session
- Automatic cleanup on session end
- Consider max patterns per session (suggested: 100)

## Implementation Order

Follow this specific order to ensure each piece builds on the previous:

1. **Start with types** (`packages/core/src/types/events.ts`)
   - This unblocks both server and client work
   - Include JSDoc comments for all interfaces

2. **Build PatternMatcher base class first**
   - Other matchers depend on this
   - Include abstract `match()` method
   - Add performance timing hooks

3. **Implement RegexMatcher next**
   - Most common use case
   - Good for testing the system end-to-end

4. **Wire up EventManager early**
   - Even with just RegexMatcher, you can test the flow
   - Add logging for debugging

5. **Integrate with BufferManager**
   - Key integration point
   - Add feature flag to enable/disable

## Code Examples Missing from Plan

### PatternMatcher Base Class
```typescript
// packages/server/src/patterns/PatternMatcher.ts
export abstract class PatternMatcher {
  constructor(
    protected config: PatternConfig,
    protected id: string
  ) {}
  
  abstract match(data: string, buffer: string): PatternMatch | null;
  
  // Helper for performance tracking
  protected measureMatch<T>(fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > 10) { // Log slow matches
      console.warn(`Slow pattern match: ${this.config.name} took ${duration}ms`);
    }
    
    return result;
  }
}
```

### BufferManager Integration
```typescript
// In packages/server/src/BufferManager.ts
class BufferManager {
  private eventManager?: EventManager; // Optional to not break existing code
  
  enableEventSystem(eventManager: EventManager) {
    this.eventManager = eventManager;
  }
  
  addData(sessionId: string, data: string): void {
    // Existing buffer logic...
    
    // New event processing
    if (this.eventManager) {
      // Process in next tick to not block terminal output
      setImmediate(() => {
        this.eventManager!.processData(sessionId, data);
      });
    }
  }
}
```

### WebSocket Message Handling
```typescript
// In packages/server/src/WebSocketServer.ts
case 'register-pattern':
  try {
    const patternId = this.eventManager.registerPattern(message.config);
    
    // Important: Track which client registered which patterns
    this.clientPatterns.get(clientId)?.add(patternId) || 
      this.clientPatterns.set(clientId, new Set([patternId]));
    
    socket.send(JSON.stringify({
      type: 'pattern-registered',
      patternId,
      requestId: message.requestId // For client correlation
    }));
  } catch (error) {
    socket.send(JSON.stringify({
      type: 'error',
      error: error.message,
      requestId: message.requestId
    }));
  }
  break;
```

## Testing Strategy Details

### 1. Unit Test Data
Create test fixtures for common scenarios:
```typescript
// tests/fixtures/terminal-outputs.ts
export const JEST_OUTPUT = `
 PASS  src/app.test.js
  ✓ should work (5ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
`;

export const BUILD_ERROR = `
ERROR in ./src/index.js
Module not found: Error: Can't resolve './missing'
`;

export const ANSI_COLORED = '\x1b[31mError:\x1b[0m File not found';
```

### 2. Integration Test Helpers
```typescript
// tests/helpers/event-helpers.ts
export async function waitForEvent(
  eventService: TerminalEventService,
  eventType: string,
  timeout = 1000
): Promise<TerminalEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    
    const unsub = eventService.subscribe([eventType], (event) => {
      clearTimeout(timer);
      unsub();
      resolve(event);
    });
  });
}
```

## Common Pitfalls to Avoid

1. **Don't match on partial ANSI sequences**
   - Buffer might split in the middle of `\x1b[31m`
   - Solution: Queue incomplete sequences

2. **Watch for regex catastrophic backtracking**
   - Test patterns with long inputs
   - Use regex timeout library if needed

3. **Handle reconnection state**
   - Patterns are server-side, persist across reconnects
   - Client needs to track its registered patterns

4. **Binary data in terminal output**
   - Some programs output binary data
   - Validate UTF-8 or handle gracefully

## Debugging Tools

Add these during implementation:

```typescript
// Debug mode for event system
if (process.env.DEBUG_EVENTS) {
  eventManager.on('pattern-registered', (pattern) => {
    console.log('[EventSystem] Pattern registered:', pattern);
  });
  
  eventManager.on('pattern-matched', (event) => {
    console.log('[EventSystem] Match found:', event);
  });
}
```

## Questions to Clarify Before Starting

1. Should patterns persist to disk or just in memory?
2. Max buffer size for pattern matching?
3. Should we support pattern priorities?
4. How to handle malformed regex from clients?

## Definition of Done

- [ ] All TypeScript types have JSDoc comments
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] Performance tests show < 1ms for typical patterns
- [ ] Demo app shows pattern matching in action
- [ ] API documentation is complete
- [ ] Error handling for edge cases
- [ ] Logging for debugging
- [ ] Feature flag to enable/disable system