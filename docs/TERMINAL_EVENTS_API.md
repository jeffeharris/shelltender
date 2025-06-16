# Terminal Events API Reference

## Overview

The Terminal Event System provides real-time pattern matching and event detection for terminal output. It's integrated into the BufferManager and accessible via WebSocket.

## Quick Start

```typescript
// Server-side
const eventManager = new EventManager();
bufferManager.setEventManager(eventManager);

// Client-side (coming soon)
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