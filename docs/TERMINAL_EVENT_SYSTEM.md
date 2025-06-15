# Terminal Event System

## Overview
A general-purpose system for detecting patterns and events in terminal output. This is a core shelltender capability that can be used by any application.

## Core Event Types

### 1. Pattern Match Events
```typescript
interface PatternMatchEvent {
  type: 'pattern-match';
  sessionId: string;
  pattern: string;
  match: string;
  position: number;
  timestamp: number;
}
```

### 2. Output State Events
```typescript
interface OutputStateEvent {
  type: 'output-state';
  sessionId: string;
  state: {
    hasOutput: boolean;
    idle: boolean;
    idleDuration?: number;
  };
}
```

### 3. ANSI Sequence Events
```typescript
interface AnsiEvent {
  type: 'ansi-sequence';
  sessionId: string;
  sequence: string;
  category: 'cursor' | 'color' | 'clear' | 'other';
}
```

### 4. Custom Pattern Events
```typescript
interface CustomPatternEvent {
  type: 'custom-pattern';
  sessionId: string;
  patternId: string;
  data: any;
}
```

## Pattern Registration API

```typescript
// In SessionManager
class SessionManager {
  registerPattern(sessionId: string, config: PatternConfig): string {
    const patternId = generateId();
    const pattern = new TerminalPattern(config);
    this.patterns.set(patternId, pattern);
    return patternId;
  }
  
  unregisterPattern(patternId: string): void {
    this.patterns.delete(patternId);
  }
}

interface PatternConfig {
  name: string;
  type: 'regex' | 'string' | 'ansi' | 'custom';
  pattern: string | RegExp | CustomMatcher;
  options?: {
    caseSensitive?: boolean;
    multiline?: boolean;
    debounce?: number;
  };
}

type CustomMatcher = (buffer: string, chunk: string) => MatchResult | null;
```

## Built-in Pattern Detectors

### 1. Prompt Detection
```typescript
const PROMPT_PATTERNS = {
  bash: /\$\s*$/,
  zsh: /[%>]\s*$/,
  fish: />\s*$/,
  generic: /[>$%#]\s*$/
};
```

### 2. Error Detection
```typescript
const ERROR_PATTERNS = {
  javascript: /Error:|TypeError:|ReferenceError:/,
  python: /Traceback|SyntaxError:|ValueError:/,
  general: /error:|failed:|Error:/i
};
```

### 3. Progress Detection
```typescript
const PROGRESS_PATTERNS = {
  percentage: /(\d+)%/,
  ratio: /(\d+)\/(\d+)/,
  dots: /\.{3,}/,
  spinner: /[|/-\\]/
};
```

## Event Subscription API

```typescript
// Client-side
interface TerminalEventClient {
  subscribe(eventTypes: string[], callback: (event: TerminalEvent) => void): () => void;
  
  registerPattern(config: PatternConfig): Promise<string>;
  
  unregisterPattern(patternId: string): Promise<void>;
}

// Usage
const unsubscribe = terminalEvents.subscribe(['pattern-match'], (event) => {
  if (event.pattern === 'error') {
    console.log('Error detected:', event.match);
  }
});
```

## WebSocket Protocol

```typescript
// Client -> Server: Register pattern
{
  type: 'register-pattern',
  sessionId: string,
  config: PatternConfig
}

// Server -> Client: Pattern registered
{
  type: 'pattern-registered',
  patternId: string
}

// Server -> Client: Event occurred
{
  type: 'terminal-event',
  event: TerminalEvent
}
```

## Implementation in BufferManager

```typescript
class BufferManager {
  private patterns: Map<string, TerminalPattern> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  
  addData(sessionId: string, data: string): void {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) return;
    
    buffer.lines.push(...data.split('\n'));
    
    // Check registered patterns
    for (const [patternId, pattern] of this.patterns) {
      const result = pattern.match(data, buffer.lines.join('\n'));
      if (result) {
        this.eventEmitter.emit('pattern-match', {
          type: 'pattern-match',
          sessionId,
          patternId,
          ...result
        });
      }
    }
  }
}
```

## Use Cases (Examples)

### 1. Build Status Monitoring
```typescript
// Register pattern for build completion
const patternId = await terminalEvents.registerPattern({
  name: 'build-complete',
  type: 'regex',
  pattern: /Build (succeeded|failed) in (\d+)s/
});
```

### 2. Test Result Detection
```typescript
// Detect test results
terminalEvents.registerPattern({
  name: 'test-results',
  type: 'regex',
  pattern: /Tests:\s*(\d+) passed,\s*(\d+) failed/
});
```

### 3. Interactive Prompt Detection
```typescript
// Detect when program is waiting for input
terminalEvents.registerPattern({
  name: 'input-prompt',
  type: 'regex',
  pattern: /\?\s*$/,
  options: { debounce: 500 }
});
```

## Benefits

1. **Framework Agnostic**: Works with any terminal application
2. **Extensible**: Easy to add new pattern types
3. **Performance**: Efficient pattern matching with debouncing
4. **Real-time**: Events fired as soon as patterns match
5. **Flexible**: Supports regex, string, ANSI, and custom matchers