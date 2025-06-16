# Terminal Events API Reference

## Overview

The Terminal Event System provides real-time pattern matching and event detection for terminal output. It's integrated into the BufferManager and accessible via WebSocket.

## Quick Start

```typescript
// Server-side
const eventManager = new EventManager();
bufferManager.setEventManager(eventManager);

// Client-side
import { TerminalEventService } from '@shelltender/client';

const eventService = new TerminalEventService(wsService);

// Register a pattern
const patternId = await eventService.registerPattern(sessionId, {
  name: 'build-error',
  type: 'regex',
  pattern: /error:|failed:/i
});

// Subscribe to events
eventService.subscribe(['pattern-match'], (event) => {
  console.log('Pattern matched:', event);
});
```

## Pattern Types

### 1. Regex Patterns
```typescript
{
  name: 'error-detector',
  type: 'regex',
  pattern: /Error: (.+)/,
  options: {
    caseSensitive: false,
    multiline: true
  }
}
```

### 2. String Patterns
```typescript
{
  name: 'prompt-detector',
  type: 'string',
  pattern: '$ ',
  options: {
    caseSensitive: true
  }
}
```

### 3. ANSI Patterns
```typescript
{
  name: 'color-detector',
  type: 'ansi',
  pattern: 'color'  // or 'cursor', 'clear', 'any'
}
```

### 4. Custom Patterns
```typescript
{
  name: 'multiline-error',
  type: 'custom',
  pattern: (data, buffer) => {
    // Custom matching logic
    const match = buffer.match(/Error[\s\S]*?Stack trace:/);
    return match ? {
      match: match[0],
      position: buffer.indexOf(match[0])
    } : null;
  }
}
```

## Event Types

### PatternMatchEvent
```typescript
{
  type: 'pattern-match',
  sessionId: string,
  patternId: string,
  patternName: string,
  timestamp: number,
  match: string,
  position: number,
  groups?: Record<string, string>
}
```

### AnsiSequenceEvent
```typescript
{
  type: 'ansi-sequence',
  sessionId: string,
  timestamp: number,
  sequence: string,
  category: 'cursor' | 'color' | 'clear' | 'other',
  parsed?: {
    command: string,
    params: number[]
  }
}
```

## WebSocket Protocol

### Register Pattern
```typescript
// Client -> Server
{
  type: 'register-pattern',
  sessionId: string,
  config: PatternConfig,
  requestId?: string
}

// Server -> Client
{
  type: 'pattern-registered',
  patternId: string,
  requestId?: string
}
```

### Subscribe to Events
```typescript
// Client -> Server
{
  type: 'subscribe-events',
  eventTypes: ['pattern-match', 'ansi-sequence'],
  sessionId?: string  // Optional: filter by session
}
```

### Receive Events
```typescript
// Server -> Client
{
  type: 'terminal-event',
  event: TerminalEvent
}
```

## Pattern Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| caseSensitive | boolean | Case sensitivity for string/regex | true |
| multiline | boolean | Enable multiline mode for regex | false |
| debounce | number | Minimum ms between matches | 0 |
| persist | boolean | Save pattern to disk | false |

## Built-in Patterns

```typescript
import { BUILT_IN_PATTERNS } from '@shelltender/core';

// Use predefined patterns
const promptPattern = BUILT_IN_PATTERNS.PROMPT.bash;
const errorPattern = BUILT_IN_PATTERNS.ERROR.javascript;
const progressPattern = BUILT_IN_PATTERNS.PROGRESS.percentage;
```

## Performance Considerations

- Patterns are matched on every data chunk
- Use debouncing for expensive patterns
- ANSI sequences are always detected (built-in)
- Pattern matching happens in setImmediate to avoid blocking

## Examples

### Detect Build Completion
```typescript
await eventManager.registerPattern(sessionId, {
  name: 'build-complete',
  type: 'regex',
  pattern: /Build (succeeded|failed) in (\d+(\.\d+)?)s/,
  options: { debounce: 1000 }
});
```

### Monitor Test Results
```typescript
await eventManager.registerPattern(sessionId, {
  name: 'jest-results',
  type: 'regex',
  pattern: /Tests:\s+(\d+) passed, (\d+) failed/
});
```

### Detect Interactive Prompts
```typescript
await eventManager.registerPattern(sessionId, {
  name: 'input-prompt',
  type: 'custom',
  pattern: (data) => {
    if (data.endsWith(': ') || data.endsWith('? ')) {
      return { match: data.trim(), position: 0 };
    }
    return null;
  }
});
```

## Client-Side Components

### TerminalEventService

The client-side service for managing pattern registration and event subscriptions:

```typescript
import { TerminalEventService } from '@shelltender/client';

const eventService = new TerminalEventService(wsService);

// Register patterns with request/response correlation
const patternId = await eventService.registerPattern(sessionId, config);

// Subscribe to events
const unsubscribe = eventService.subscribe(['pattern-match'], (event) => {
  console.log('Pattern matched:', event);
});

// Subscribe to session-specific events
const unsubscribeSess = eventService.subscribeToSession(sessionId, (event) => {
  console.log('Session event:', event);
});
```

### useTerminalEvents Hook

React hook for terminal events with automatic cleanup:

```typescript
import { useTerminalEvents } from '@shelltender/client';

function MyComponent({ sessionId }) {
  const { events, registerPattern, clearEvents, isConnected } = useTerminalEvents(sessionId);
  
  useEffect(() => {
    // Patterns are automatically cleaned up on unmount
    registerPattern({
      name: 'error-detector',
      type: 'regex',
      pattern: /error:/i
    });
  }, []);
  
  return (
    <div>
      {events.map(event => (
        <div key={event.timestamp}>{event.match}</div>
      ))}
    </div>
  );
}
```

### TerminalEventMonitor Component

Pre-built UI component for monitoring terminal events:

```typescript
import { TerminalEventMonitor } from '@shelltender/client';

function App() {
  return (
    <div>
      <Terminal sessionId={sessionId} />
      <TerminalEventMonitor sessionId={sessionId} />
    </div>
  );
}
```

## WebSocket Service Updates

The WebSocketService now supports event emitter pattern:

```typescript
// Listen for specific message types
wsService.on('terminal-event', (data) => {
  console.log('Received event:', data.event);
});

wsService.on('pattern-registered', (data) => {
  console.log('Pattern registered:', data.patternId);
});

// Send typed messages
wsService.send({
  type: 'register-pattern',
  sessionId: 'session-1',
  config: patternConfig,
  requestId: 'req-123'
});

// Remove handlers
wsService.off('terminal-event', handler);
```

## Error Handling

All async operations (pattern registration/unregistration) include:
- Request/response correlation with `requestId`
- 10-second timeout
- Error propagation via promise rejection
- Automatic cleanup on timeout

## Configuration

### WebSocket URL
The WebSocket URL can be configured via environment variable:
```bash
REACT_APP_WS_URL=ws://localhost:8080 npm start
```

Default: `ws://localhost:8080`

### Event History Limit
The `useTerminalEvents` hook accepts options to limit event history:
```typescript
const { events } = useTerminalEvents(sessionId, { 
  maxEvents: 500  // Default: 1000
});
```

## Advanced Features

### Pattern Persistence
Patterns can be persisted to disk by setting the `persist` option:
```typescript
await registerPattern({
  name: 'critical-error',
  type: 'regex',
  pattern: /CRITICAL|FATAL/i,
  options: { persist: true }
});
```

### Get Registered Patterns
Retrieve all patterns for a session:
```typescript
const patterns = await eventService.getPatterns(sessionId);
// Returns: Array<{ patternId, config, sessionId }>
```

### Pattern Validation
Basic client-side validation is performed before sending to server:
- Regex patterns are validated for syntax
- String patterns must be strings
- All patterns must have name and type

## Testing

The client implementation includes comprehensive test coverage:
- Unit tests for TerminalEventService with mocked WebSocket
- Hook tests with React Testing Library
- Component tests for TerminalEventMonitor
- WebSocket integration tests with event emitter pattern
- Pattern validation tests