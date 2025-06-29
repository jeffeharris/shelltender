# Observer Pattern Implementation Guide for Shelltender

## Overview

This guide provides step-by-step instructions for implementing the Observer pattern in Shelltender to create a clean, extensible architecture for terminal data processing. This will replace the current direct coupling between components with a centralized data pipeline.

## Goals

1. **Decouple components** - SessionManager, BufferManager, EventManager, and WebSocketServer should not directly depend on each other
2. **Enable data transformation** - Allow security filters, sanitizers, and processors to modify data before it reaches consumers
3. **Support multiple subscribers** - Any component can subscribe to terminal data events
4. **Maintain backwards compatibility** - Existing API should continue to work
5. **Improve testability** - Each component can be tested in isolation

## Architecture Overview

```
┌─────────────┐
│   PTY       │
│  Process    │
└──────┬──────┘
       │ Raw Data
       ▼
┌─────────────────────────────────────┐
│      TerminalDataPipeline           │
│  ┌─────────────────────────────┐    │
│  │  Filters (can block data)   │    │
│  │  - Security Filter          │    │
│  │  - Binary Data Filter       │    │
│  │  - Rate Limiter            │    │
│  └──────────┬──────────────────┘    │
│             │                        │
│  ┌──────────▼──────────────────┐    │
│  │  Processors (transform)     │    │
│  │  - Redact Sensitive Data    │    │
│  │  - Strip ANSI Codes         │    │
│  │  - Format/Normalize         │    │
│  └──────────┬──────────────────┘    │
│             │                        │
│  ┌──────────▼──────────────────┐    │
│  │     Event Emission          │    │
│  │  - data:raw                 │    │
│  │  - data:processed           │    │
│  │  - data:transformed         │    │
│  └─────────────────────────────┘    │
└───────────────┬─────────────────────┘
                │ Events
     ┌──────────┴──────────┬─────────────┬──────────────┐
     ▼                     ▼             ▼              ▼
┌─────────────┐   ┌──────────────┐ ┌──────────┐ ┌─────────────┐
│BufferManager│   │WebSocketServer│ │EventMgr  │ │ Audit Log   │
└─────────────┘   └──────────────┘ └──────────┘ └─────────────┘
```

## Implementation Steps

### Step 1: Create Core Pipeline Types

**File**: `packages/core/src/types/pipeline.ts`

```typescript
export interface TerminalDataEvent {
  sessionId: string;
  data: string;
  timestamp: number;
  metadata?: {
    source?: 'pty' | 'user' | 'system';
    encoding?: string;
    [key: string]: any;
  };
}

export interface ProcessedDataEvent extends TerminalDataEvent {
  originalData: string;
  processedData: string;
  transformations: string[];
}

export type DataProcessor = (event: TerminalDataEvent) => TerminalDataEvent | null;
export type DataFilter = (event: TerminalDataEvent) => boolean;

export interface PipelineOptions {
  maxListeners?: number;
  enableAudit?: boolean;
  enableMetrics?: boolean;
}
```

### Step 2: Implement TerminalDataPipeline

**File**: `packages/server/src/TerminalDataPipeline.ts`

```typescript
import { EventEmitter } from 'events';
import { 
  TerminalDataEvent, 
  ProcessedDataEvent, 
  DataProcessor, 
  DataFilter,
  PipelineOptions 
} from '@shelltender/core';

export class TerminalDataPipeline extends EventEmitter {
  private processors = new Map<string, { processor: DataProcessor; priority: number }>();
  private filters = new Map<string, DataFilter>();
  private processorOrder: string[] = [];
  
  constructor(private options: PipelineOptions = {}) {
    super();
    this.setMaxListeners(options.maxListeners || 100);
  }

  addProcessor(name: string, processor: DataProcessor, priority: number = 50): void {
    this.processors.set(name, { processor, priority });
    this.updateProcessorOrder();
  }

  addFilter(name: string, filter: DataFilter): void {
    this.filters.set(name, filter);
  }

  async processData(sessionId: string, data: string, metadata?: any): Promise<void> {
    // Implementation from example
  }

  // ... rest of implementation
}
```

### Step 3: Create SessionManager Interface

**File**: `packages/server/src/interfaces/ISessionManager.ts`

```typescript
export interface IDataEmitter {
  onData(callback: (sessionId: string, data: string, metadata?: any) => void): () => void;
  onSessionEnd(callback: (sessionId: string) => void): () => void;
}

export interface ISessionManager extends IDataEmitter {
  createSession(options: SessionOptions): TerminalSession;
  getSession(sessionId: string): TerminalSession | null;
  writeToSession(sessionId: string, data: string): boolean;
  killSession(sessionId: string): boolean;
  getAllSessions(): TerminalSession[];
}
```

### Step 4: Modify SessionManager

**File**: `packages/server/src/SessionManager.ts`

```typescript
import { EventEmitter } from 'events';
import { ISessionManager, IDataEmitter } from './interfaces/ISessionManager';

export class SessionManager extends EventEmitter implements ISessionManager {
  // ... existing code ...

  private setupPtyHandlers(sessionId: string, ptyProcess: pty.IPty): void {
    ptyProcess.onData((data: string) => {
      // Emit data event instead of directly processing
      this.emit('data', sessionId, data, { source: 'pty' });
    });

    ptyProcess.onExit(() => {
      this.emit('sessionEnd', sessionId);
      // ... cleanup code ...
    });
  }

  // Implement IDataEmitter
  onData(callback: (sessionId: string, data: string, metadata?: any) => void): () => void {
    this.on('data', callback);
    return () => this.off('data', callback);
  }

  onSessionEnd(callback: (sessionId: string) => void): () => void {
    this.on('sessionEnd', callback);
    return () => this.off('sessionEnd', callback);
  }

  // Remove direct dependencies on BufferManager and broadcasting
  // These will be handled by subscribers
}
```

### Step 5: Create Integration Module

**File**: `packages/server/src/integration/PipelineIntegration.ts`

```typescript
import { SessionManager } from '../SessionManager';
import { BufferManager } from '../BufferManager';
import { EventManager } from '../events/EventManager';
import { TerminalDataPipeline } from '../TerminalDataPipeline';
import { WebSocketServer } from '../WebSocketServer';

export class PipelineIntegration {
  constructor(
    private pipeline: TerminalDataPipeline,
    private sessionManager: SessionManager,
    private bufferManager: BufferManager,
    private wsServer: WebSocketServer,
    private eventManager?: EventManager
  ) {}

  setup(): void {
    // Connect SessionManager to Pipeline
    this.sessionManager.onData((sessionId, data, metadata) => {
      this.pipeline.processData(sessionId, data, metadata);
    });

    // Connect Pipeline to BufferManager
    this.pipeline.onData((event) => {
      this.bufferManager.addToBuffer(event.sessionId, event.processedData);
    });

    // Connect Pipeline to WebSocketServer
    this.pipeline.onData((event) => {
      this.wsServer.broadcastToSession(event.sessionId, {
        type: 'output',
        sessionId: event.sessionId,
        data: event.processedData,
      });
    });

    // Connect Pipeline to EventManager if available
    if (this.eventManager) {
      this.pipeline.onData((event) => {
        const buffer = this.bufferManager.getBuffer(event.sessionId);
        this.eventManager.processData(event.sessionId, event.processedData, buffer);
      });
    }

    // Set up audit logging
    if (this.pipeline.options.enableAudit) {
      this.pipeline.on('data:raw', this.auditLog.bind(this));
    }
  }

  private auditLog(event: { sessionId: string; data: string }): void {
    // Implement audit logging
    console.log(`[AUDIT] Session ${event.sessionId}: ${event.data.substring(0, 100)}`);
  }
}
```

### Step 6: Update Server Initialization

**File**: `apps/demo/src/server/index.ts`

```typescript
import { 
  SessionManager, 
  BufferManager, 
  SessionStore, 
  WebSocketServer, 
  EventManager,
  TerminalDataPipeline,
  PipelineIntegration,
  CommonProcessors,
  CommonFilters
} from '@shelltender/server';

// Initialize core components
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(sessionStore); // Note: removed bufferManager dependency
const eventManager = new EventManager();

// Initialize pipeline
const pipeline = new TerminalDataPipeline({
  enableAudit: process.env.ENABLE_AUDIT === 'true',
  enableMetrics: process.env.ENABLE_METRICS === 'true'
});

// Configure pipeline processors
pipeline.addProcessor('security', CommonProcessors.securityFilter([
  /password["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
  /api[_-]?key["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
]), 10);

pipeline.addProcessor('rate-limit', CommonProcessors.rateLimiter(1024 * 1024), 20);

// Configure pipeline filters
pipeline.addFilter('no-binary', CommonFilters.noBinary());

// Initialize WebSocket server
const wsServer = new WebSocketServer(wsPort, sessionManager, bufferManager, eventManager);

// Set up integration
const integration = new PipelineIntegration(
  pipeline,
  sessionManager,
  bufferManager,
  wsServer,
  eventManager
);
integration.setup();
```

### Step 7: Create Migration Guide

**File**: `docs/OBSERVER_PATTERN_MIGRATION.md`

```markdown
# Migration Guide

## Breaking Changes

1. SessionManager no longer directly depends on BufferManager
2. Data flow is now event-based rather than direct method calls
3. WebSocketServer must be initialized after pipeline setup

## Migration Steps

1. Update SessionManager initialization:
   ```typescript
   // Old
   const sessionManager = new SessionManager(bufferManager, sessionStore);
   
   // New
   const sessionManager = new SessionManager(sessionStore);
   ```

2. Set up pipeline integration:
   ```typescript
   const integration = new PipelineIntegration(
     pipeline, sessionManager, bufferManager, wsServer, eventManager
   );
   integration.setup();
   ```

3. Update any direct buffer access:
   ```typescript
   // Old
   sessionManager.getBufferForSession(sessionId);
   
   // New
   bufferManager.getBuffer(sessionId);
   ```

## Testing Changes

Components can now be tested in isolation:

```typescript
// Test SessionManager without dependencies
const sessionManager = new SessionManager(mockStore);
const events: any[] = [];
sessionManager.onData((sessionId, data) => {
  events.push({ sessionId, data });
});

// Test pipeline without real components
const pipeline = new TerminalDataPipeline();
const processed: any[] = [];
pipeline.onData(event => processed.push(event));
```
```

### Step 8: Testing Strategy

**File**: `packages/server/tests/integration/pipeline.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TerminalDataPipeline } from '../src/TerminalDataPipeline';
import { SessionManager } from '../src/SessionManager';
import { BufferManager } from '../src/BufferManager';

describe('Pipeline Integration', () => {
  it('should process data through pipeline', async () => {
    const pipeline = new TerminalDataPipeline();
    const processedEvents: any[] = [];
    
    // Add test processor
    pipeline.addProcessor('test', (event) => ({
      ...event,
      data: event.data.toUpperCase()
    }));
    
    // Subscribe to events
    pipeline.onData(event => processedEvents.push(event));
    
    // Process data
    await pipeline.processData('session-1', 'hello world');
    
    expect(processedEvents).toHaveLength(1);
    expect(processedEvents[0].processedData).toBe('HELLO WORLD');
    expect(processedEvents[0].transformations).toContain('test');
  });

  it('should filter sensitive data', async () => {
    const pipeline = new TerminalDataPipeline();
    const events: any[] = [];
    
    // Add security processor
    pipeline.addProcessor('security', CommonProcessors.securityFilter([
      /password:\s*\w+/gi
    ]), 10);
    
    pipeline.onData(event => events.push(event));
    
    await pipeline.processData('session-1', 'password: secret123');
    
    expect(events[0].processedData).toBe('password: [REDACTED]');
  });
});
```

## Implementation Timeline

### Phase 1: Core Implementation (2-3 days)
- [ ] Create pipeline types in core package
- [ ] Implement TerminalDataPipeline
- [ ] Create ISessionManager interface
- [ ] Add tests for pipeline

### Phase 2: Component Updates (2-3 days)
- [ ] Update SessionManager to emit events
- [ ] Create PipelineIntegration module
- [ ] Update WebSocketServer integration
- [ ] Add backwards compatibility layer

### Phase 3: Migration (1-2 days)
- [ ] Update demo app
- [ ] Update all tests
- [ ] Create migration documentation
- [ ] Performance testing

### Phase 4: Enhanced Features (Optional, 2-3 days)
- [ ] Add more processors (PII detection, etc.)
- [ ] Add metrics collection
- [ ] Add pipeline monitoring UI
- [ ] Add configuration management

## Best Practices

1. **Always use typed events** - Don't use `any` types for events
2. **Document processors** - Each processor should have clear documentation
3. **Test in isolation** - Each component should be testable without others
4. **Monitor performance** - Add metrics for processing time
5. **Handle errors gracefully** - Pipeline should continue even if one processor fails

## Configuration

### Environment Variables

```bash
# Enable audit logging
ENABLE_AUDIT=true

# Enable metrics collection
ENABLE_METRICS=true

# Set max events in memory
MAX_EVENT_BUFFER=1000

# Enable debug logging
DEBUG=shelltender:pipeline
```

### Pipeline Configuration

```typescript
const pipelineConfig = {
  processors: {
    security: {
      priority: 10,
      patterns: [
        /password["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
        /token["\s]*[:=]\s*["']?[^"'\s]+["']?/gi,
      ]
    },
    rateLimit: {
      priority: 20,
      maxBytesPerSecond: 1024 * 1024
    }
  },
  filters: {
    noBinary: true,
    sessionAllowlist: ['session-1', 'session-2']
  }
};
```

## Security Considerations

1. **Audit Trail** - Raw data should be logged separately from processed data
2. **Access Control** - Only authorized components should subscribe to raw data
3. **Data Retention** - Implement policies for how long audit logs are kept
4. **Encryption** - Consider encrypting audit logs at rest
5. **Compliance** - Ensure processors meet regulatory requirements (PCI, HIPAA, etc.)

## Troubleshooting

### Common Issues

1. **Events not being received**
   - Check that pipeline integration is set up
   - Verify event names match
   - Check for errors in console

2. **Data being dropped**
   - Check filter logs
   - Verify processors aren't returning null
   - Check rate limits

3. **Performance issues**
   - Monitor processor execution time
   - Check for memory leaks in subscribers
   - Consider batching events

## Future Enhancements

1. **Pipeline UI** - Visual representation of data flow
2. **Hot Reload** - Update processors without restart
3. **Distributed Pipeline** - Scale across multiple servers
4. **ML Integration** - Detect anomalies in terminal usage
5. **Advanced Filtering** - Complex rule engine for filtering