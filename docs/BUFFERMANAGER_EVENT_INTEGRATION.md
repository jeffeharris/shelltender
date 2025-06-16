# BufferManager Event System Integration

## Current State
The BufferManager currently only stores and retrieves buffers. It needs updates to support the event system.

## Required Changes

### 1. Add EventManager Integration

```typescript
// packages/server/src/BufferManager.ts
import { EventManager } from './events/EventManager.js';

export class BufferManager {
  private buffers: Map<string, string> = new Map();
  private maxBufferSize: number;
  private eventManager?: EventManager;  // Optional to maintain backward compatibility

  constructor(maxBufferSize: number = 100000) {
    this.maxBufferSize = maxBufferSize;
  }

  // New method to enable event system
  setEventManager(eventManager: EventManager): void {
    this.eventManager = eventManager;
  }

  addToBuffer(sessionId: string, data: string): void {
    if (!this.buffers.has(sessionId)) {
      this.buffers.set(sessionId, '');
    }

    let buffer = this.buffers.get(sessionId)!;
    buffer += data;

    // Trim buffer if it exceeds max size (keep last N characters)
    if (buffer.length > this.maxBufferSize) {
      buffer = buffer.slice(buffer.length - this.maxBufferSize);
    }

    this.buffers.set(sessionId, buffer);

    // NEW: Process events if event system is enabled
    if (this.eventManager) {
      // Use setImmediate to avoid blocking terminal output
      setImmediate(() => {
        this.eventManager!.processData(sessionId, data, buffer);
      });
    }
  }

  // Existing methods remain unchanged...
}
```

### 2. Update SessionManager Integration

```typescript
// packages/server/src/SessionManager.ts
export class SessionManager {
  private bufferManager: BufferManager;
  private eventManager?: EventManager;

  constructor() {
    this.bufferManager = new BufferManager();
  }

  // New method to enable event system
  enableEventSystem(eventManager: EventManager): void {
    this.eventManager = eventManager;
    this.bufferManager.setEventManager(eventManager);
  }

  // In createSession method, register session with event manager
  createSession(command?: string, restricted?: boolean): SessionInfo {
    // ... existing session creation ...

    if (this.eventManager) {
      this.eventManager.registerSession(sessionId);
    }

    return sessionInfo;
  }

  // In removeSession method, cleanup event manager
  removeSession(sessionId: string): void {
    // ... existing cleanup ...

    if (this.eventManager) {
      this.eventManager.unregisterSession(sessionId);
    }
  }
}
```

### 3. Performance Considerations

The BufferManager processes data on EVERY terminal output, so performance is critical:

```typescript
export interface BufferManagerOptions {
  maxBufferSize?: number;
  eventProcessingMode?: 'immediate' | 'batched' | 'throttled';
  eventBatchSize?: number;
  eventThrottleMs?: number;
}

export class BufferManager {
  private eventQueue: Map<string, string[]> = new Map();
  private eventTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private options: BufferManagerOptions = {}) {
    this.maxBufferSize = options.maxBufferSize || 100000;
  }

  private processEvents(sessionId: string, data: string, buffer: string): void {
    if (!this.eventManager) return;

    switch (this.options.eventProcessingMode) {
      case 'immediate':
        setImmediate(() => {
          this.eventManager!.processData(sessionId, data, buffer);
        });
        break;

      case 'batched':
        this.batchEvent(sessionId, data, buffer);
        break;

      case 'throttled':
        this.throttleEvent(sessionId, data, buffer);
        break;

      default:
        // Default to immediate for backward compatibility
        setImmediate(() => {
          this.eventManager!.processData(sessionId, data, buffer);
        });
    }
  }

  private batchEvent(sessionId: string, data: string, buffer: string): void {
    // Queue the data
    if (!this.eventQueue.has(sessionId)) {
      this.eventQueue.set(sessionId, []);
    }
    this.eventQueue.get(sessionId)!.push(data);

    // Process when batch is full or on next tick
    const queue = this.eventQueue.get(sessionId)!;
    if (queue.length >= (this.options.eventBatchSize || 10)) {
      const batch = queue.join('');
      this.eventQueue.set(sessionId, []);
      
      setImmediate(() => {
        this.eventManager!.processData(sessionId, batch, buffer);
      });
    }
  }

  private throttleEvent(sessionId: string, data: string, buffer: string): void {
    // Clear existing timer
    const existingTimer = this.eventTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.eventTimers.delete(sessionId);
      this.eventManager!.processData(sessionId, data, buffer);
    }, this.options.eventThrottleMs || 100);

    this.eventTimers.set(sessionId, timer);
  }
}
```

### 4. Testing BufferManager Integration

```typescript
describe('BufferManager Event Integration', () => {
  it('should trigger event processing when data is added', async () => {
    const bufferManager = new BufferManager();
    const eventManager = new MockEventManager();
    
    bufferManager.setEventManager(eventManager);
    
    bufferManager.addToBuffer('session1', 'test data');
    
    // Wait for setImmediate
    await new Promise(resolve => setImmediate(resolve));
    
    expect(eventManager.processData).toHaveBeenCalledWith(
      'session1',
      'test data',
      'test data'
    );
  });

  it('should handle high-frequency updates', async () => {
    const bufferManager = new BufferManager({
      eventProcessingMode: 'throttled',
      eventThrottleMs: 50
    });
    const eventManager = new MockEventManager();
    
    bufferManager.setEventManager(eventManager);
    
    // Rapid updates
    for (let i = 0; i < 100; i++) {
      bufferManager.addToBuffer('session1', `data${i}\n`);
    }
    
    // Should only process once after throttle period
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(eventManager.processData).toHaveBeenCalledTimes(1);
  });
});
```

### 5. Configuration Options

Add to server startup:

```typescript
// packages/server/src/index.ts
const bufferManager = new BufferManager({
  maxBufferSize: config.maxBufferSize || 100000,
  eventProcessingMode: config.eventMode || 'immediate',
  eventBatchSize: config.eventBatchSize || 10,
  eventThrottleMs: config.eventThrottleMs || 100
});

// Only enable if feature flag is set
if (config.enableEventSystem) {
  const eventManager = new EventManager();
  sessionManager.enableEventSystem(eventManager);
}
```

## Migration Path

1. **Phase 1**: Add methods but don't enable by default
2. **Phase 2**: Enable with feature flag for testing
3. **Phase 3**: Enable by default with ability to disable
4. **Phase 4**: Remove feature flag once stable

## Impact on Existing Code

- **Backward Compatible**: Event system is optional
- **No Breaking Changes**: Existing methods unchanged
- **Performance**: Minimal impact when disabled
- **Memory**: Small increase for event queue/timers