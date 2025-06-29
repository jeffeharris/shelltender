# Observer Pattern Architecture Diagrams

## Current Architecture (Tightly Coupled)

```
┌─────────────┐         ┌──────────────┐
│     PTY     │────────▶│SessionManager│
└─────────────┘         └──────┬───────┘
                               │ Directly calls
                               ├────────────────┐
                               │                │
                         ┌─────▼──────┐   ┌────▼────────┐
                         │BufferManager│   │WebSocketServer│
                         └────────────┘   └──────┬──────┘
                                                 │
                                          ┌──────▼──────┐
                                          │EventManager │
                                          └─────────────┘

Problems:
- SessionManager needs to know about all consumers
- Hard to add new consumers
- Can't transform data before storage
- Difficult to test components in isolation
```

## New Architecture (Observer Pattern)

```
┌─────────────┐
│     PTY     │
└──────┬──────┘
       │ emits 'data' event
       ▼
┌─────────────┐         ┌──────────────────────────────┐
│SessionManager│────────▶│   TerminalDataPipeline      │
└─────────────┘ onData()│                              │
                        │  ┌────────────────────┐      │
                        │  │ Filters & Processors│      │
                        │  │ ┌────────────────┐ │      │
                        │  │ │Security Filter │ │      │
                        │  │ └────────┬───────┘ │      │
                        │  │          ▼         │      │
                        │  │ ┌────────────────┐ │      │
                        │  │ │  Rate Limiter  │ │      │
                        │  │ └────────┬───────┘ │      │
                        │  │          ▼         │      │
                        │  │ ┌────────────────┐ │      │
                        │  │ │   Sanitizer    │ │      │
                        │  │ └────────────────┘ │      │
                        │  └────────────────────┘      │
                        │                              │
                        │         Emits Events         │
                        └──────────────┬───────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
              'data:processed'   'data:raw'      'data:transformed'
                    │                  │                  │
     ┌──────────────┴──────┐   ┌──────┴─────┐   ┌───────┴────────┐
     │                     │   │            │   │                │
     ▼              ▼      ▼   ▼            ▼   ▼                ▼
┌──────────┐ ┌───────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│  Buffer  │ │WebSocket  │ │ Event  │ │  Audit   │ │   Metrics    │
│ Manager  │ │  Server   │ │Manager │ │   Log    │ │  Collector   │
└──────────┘ └───────────┘ └────────┘ └──────────┘ └──────────────┘

Benefits:
✓ SessionManager doesn't know about consumers
✓ Easy to add new consumers (just subscribe)
✓ Data can be transformed before reaching consumers
✓ Each component can be tested independently
✓ Single place to implement security policies
```

## Data Flow Sequence

```
1. User types in terminal
   │
   ▼
2. PTY Process receives input and generates output
   │
   ▼
3. SessionManager receives PTY data
   │
   ├─► emits: onData(sessionId, data, {source: 'pty'})
   │
   ▼
4. TerminalDataPipeline receives event
   │
   ├─► Applies Filters (can block data)
   │   ├─► Security Filter: blocks malicious patterns
   │   ├─► Binary Filter: blocks non-text data
   │   └─► Rate Limiter: blocks if too much data
   │
   ├─► Applies Processors (transforms data)
   │   ├─► Security Processor: redacts passwords
   │   ├─► Compliance: removes credit cards
   │   └─► Formatter: normalizes line endings
   │
   ├─► Emits Events:
   │   ├─► 'data:raw' - Original unmodified data
   │   ├─► 'data:transformed' - If any changes made
   │   └─► 'data:processed' - Final processed data
   │
   ▼
5. Subscribers receive events
   │
   ├─► BufferManager: stores processed data
   ├─► WebSocketServer: sends to clients
   ├─► EventManager: checks for pattern matches
   ├─► AuditLog: records raw data
   └─► Metrics: tracks usage statistics
```

## Component Interactions

### SessionManager (Event Producer)
```typescript
class SessionManager extends EventEmitter {
  // When PTY data arrives:
  handlePtyData(sessionId: string, data: string) {
    this.emit('data', sessionId, data, { source: 'pty' });
  }
  
  // Public subscription method:
  onData(callback: Function): Function {
    this.on('data', callback);
    return () => this.off('data', callback);
  }
}
```

### Pipeline (Event Processor & Re-emitter)
```typescript
class TerminalDataPipeline extends EventEmitter {
  async processData(sessionId: string, data: string) {
    // 1. Create event object
    let event = { sessionId, data, timestamp: Date.now() };
    
    // 2. Apply filters (can block)
    for (const filter of this.filters) {
      if (!filter(event)) return; // Blocked
    }
    
    // 3. Apply processors (can transform)
    for (const processor of this.processors) {
      event = processor(event) || event;
    }
    
    // 4. Emit various events
    this.emit('data:raw', { sessionId, data: originalData });
    this.emit('data:processed', event);
  }
}
```

### Subscribers (Event Consumers)
```typescript
// BufferManager subscribes
pipeline.onData((event) => {
  bufferManager.addToBuffer(event.sessionId, event.processedData);
});

// WebSocketServer subscribes  
pipeline.onData((event) => {
  wsServer.broadcast(event.sessionId, {
    type: 'output',
    data: event.processedData
  });
});

// Audit Log subscribes to raw data
pipeline.on('data:raw', (event) => {
  auditLog.write({
    timestamp: Date.now(),
    sessionId: event.sessionId,
    data: event.data,
    hash: crypto.hash(event.data) // for integrity
  });
});
```

## Adding New Features

### Example: Add Syntax Highlighting
```typescript
// 1. Create processor
const syntaxHighlighter: DataProcessor = (event) => {
  const highlighted = addAnsiColors(event.data);
  return { ...event, data: highlighted };
};

// 2. Add to pipeline
pipeline.addProcessor('syntax', syntaxHighlighter, 60);

// That's it! All consumers now get highlighted output
```

### Example: Add Session Recording
```typescript
// 1. Create subscriber
const recorder = new SessionRecorder();

// 2. Subscribe to events
pipeline.onData((event) => {
  recorder.record(event.sessionId, event.processedData);
});

// 3. Subscribe to session end
sessionManager.onSessionEnd((sessionId) => {
  recorder.finalize(sessionId);
});

// No changes needed to existing code!
```

## Testing Architecture

### Test SessionManager in Isolation
```typescript
const sessionManager = new SessionManager(mockStore);
const events = [];

sessionManager.onData((sid, data) => events.push({ sid, data }));
sessionManager.handlePtyData('test-1', 'hello');

expect(events).toEqual([{ sid: 'test-1', data: 'hello' }]);
```

### Test Pipeline in Isolation
```typescript
const pipeline = new TerminalDataPipeline();
pipeline.addProcessor('test', event => ({
  ...event,
  data: event.data.toUpperCase()
}));

const results = [];
pipeline.onData(e => results.push(e));

await pipeline.processData('test-1', 'hello');
expect(results[0].processedData).toBe('HELLO');
```

### Test Integration
```typescript
// Use real components but with test data
const integration = new PipelineIntegration(
  pipeline,
  sessionManager,
  bufferManager,
  mockWsServer,
  eventManager
);
integration.setup();

// Verify data flows through entire system
sessionManager.handlePtyData('test-1', 'test data');

// Check all components received data
expect(bufferManager.getBuffer('test-1')).toContain('test data');
expect(mockWsServer.broadcasts).toContain('test data');
```