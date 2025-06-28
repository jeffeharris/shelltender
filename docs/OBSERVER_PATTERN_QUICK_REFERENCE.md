# Observer Pattern Quick Reference

## Core Concept
Replace direct dependencies between components with a centralized event-based pipeline that all components subscribe to.

## Key Components

### 1. TerminalDataPipeline
- **Purpose**: Central hub for all terminal data
- **Location**: `packages/server/src/TerminalDataPipeline.ts`
- **Responsibilities**:
  - Filter data (security, rate limiting)
  - Transform data (redact sensitive info)
  - Emit events to subscribers

### 2. Updated SessionManager
- **Change**: Remove direct dependencies on BufferManager
- **New behavior**: Emit 'data' events instead of calling methods
- **Key methods**:
  ```typescript
  onData(callback) - Subscribe to terminal data
  onSessionEnd(callback) - Subscribe to session termination
  ```

### 3. PipelineIntegration
- **Purpose**: Wire components together
- **Location**: `packages/server/src/integration/PipelineIntegration.ts`
- **Sets up**:
  - SessionManager → Pipeline
  - Pipeline → BufferManager
  - Pipeline → WebSocketServer
  - Pipeline → EventManager

## Implementation Checklist

### Week 1: Foundation
- [ ] Create pipeline types in `@shelltender/core`
- [ ] Implement `TerminalDataPipeline` class
- [ ] Add `CommonProcessors` (security, rate limit)
- [ ] Add `CommonFilters` (binary, session allowlist)
- [ ] Write unit tests for pipeline

### Week 2: Integration
- [ ] Update SessionManager to extend EventEmitter
- [ ] Remove BufferManager dependency from SessionManager
- [ ] Create PipelineIntegration module
- [ ] Update demo app to use pipeline
- [ ] Test backwards compatibility

### Week 3: Migration & Testing
- [ ] Update all existing tests
- [ ] Add integration tests
- [ ] Performance benchmarking
- [ ] Documentation updates
- [ ] Create migration script for existing deployments

## Code Examples

### Setting Up Pipeline (in server initialization)
```typescript
// 1. Create pipeline
const pipeline = new TerminalDataPipeline();

// 2. Add processors (order matters!)
pipeline.addProcessor('security', securityProcessor, 10);
pipeline.addProcessor('rate-limit', rateLimiter, 20);

// 3. Add filters
pipeline.addFilter('no-binary', noBinaryFilter);

// 4. Set up integration
const integration = new PipelineIntegration(
  pipeline,
  sessionManager,
  bufferManager,
  wsServer,
  eventManager
);
integration.setup();
```

### Subscribing to Events
```typescript
// Subscribe to all processed data
pipeline.onData((event) => {
  console.log(`Session ${event.sessionId}: ${event.processedData}`);
});

// Subscribe to specific session
pipeline.onSessionData('session-123', (event) => {
  // Handle data for this session only
});

// Subscribe to raw data (before processing)
pipeline.on('data:raw', ({ sessionId, data }) => {
  // Audit logging, etc.
});
```

### Creating Custom Processor
```typescript
const myProcessor: DataProcessor = (event) => {
  // Transform the data
  const transformed = event.data.replace(/foo/g, 'bar');
  
  // Return modified event
  return {
    ...event,
    data: transformed
  };
  
  // Or return null to drop the data
  // return null;
};

pipeline.addProcessor('my-processor', myProcessor, 50);
```

## Testing Strategy

### Unit Tests
```typescript
// Test processor in isolation
const processor = CommonProcessors.securityFilter([/password:\s*\w+/]);
const result = processor({
  sessionId: 'test',
  data: 'password: secret',
  timestamp: Date.now()
});
expect(result.data).toBe('password: [REDACTED]');
```

### Integration Tests
```typescript
// Test full pipeline
const pipeline = new TerminalDataPipeline();
const events = [];

pipeline.onData(e => events.push(e));
await pipeline.processData('session-1', 'test data');

expect(events).toHaveLength(1);
expect(events[0].sessionId).toBe('session-1');
```

## Common Pitfalls

1. **Don't forget to unsubscribe**
   ```typescript
   const unsubscribe = pipeline.onData(handler);
   // Later...
   unsubscribe(); // Clean up!
   ```

2. **Processor order matters**
   - Security filters should run first (priority 10-20)
   - Transformers in middle (priority 30-70)
   - Logging last (priority 80-100)

3. **Handle errors in processors**
   ```typescript
   pipeline.on('error', ({ phase, name, error }) => {
     console.error(`Pipeline error in ${name}:`, error);
   });
   ```

4. **Don't modify event objects directly**
   ```typescript
   // Wrong
   event.data = 'modified';
   return event;
   
   // Right
   return { ...event, data: 'modified' };
   ```

## Monitoring & Debugging

### Enable Debug Logging
```bash
DEBUG=shelltender:pipeline npm run dev
```

### Monitor Pipeline Performance
```typescript
pipeline.on('data:processed', (event) => {
  const processingTime = Date.now() - event.timestamp;
  if (processingTime > 100) {
    console.warn(`Slow processing: ${processingTime}ms`);
  }
});
```

### Track Transformations
```typescript
pipeline.on('data:transformed', (event) => {
  console.log('Transformations applied:', event.transformations);
});
```

## Benefits After Implementation

1. **Security**: Centralized place to filter sensitive data
2. **Flexibility**: Easy to add new processors/filters
3. **Testing**: Components can be tested in isolation
4. **Monitoring**: Single place to monitor all data flow
5. **Performance**: Can add caching, batching, etc.
6. **Compliance**: Audit trail for all terminal data

## Questions?

- Review the full guide: `OBSERVER_PATTERN_IMPLEMENTATION_GUIDE.md`
- Check examples: `packages/server/src/examples/PipelineExample.ts`
- Architecture diagrams: See main implementation guide