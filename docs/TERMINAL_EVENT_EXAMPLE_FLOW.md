# Terminal Event System - Example Flow

This document shows a complete example of how the terminal event system works from client registration to event delivery.

## Scenario: Detecting Build Completion

A developer wants to be notified when their build completes.

### Step 1: Client Registers Pattern

```typescript
// In the frontend application
const eventService = new TerminalEventService(websocket);

// Register pattern to detect build completion
const patternId = await eventService.registerPattern(sessionId, {
  name: 'build-complete',
  type: 'regex',
  pattern: /Build (succeeded|failed) in (\d+\.?\d*) seconds/,
  options: {
    caseSensitive: false,
    debounce: 100  // Don't fire multiple times rapidly
  }
});
```

### Step 2: WebSocket Message Flow

```javascript
// Client -> Server
{
  "type": "register-pattern",
  "sessionId": "session-123",
  "requestId": "req-456",  // For correlation
  "config": {
    "name": "build-complete",
    "type": "regex",
    "pattern": "/Build (succeeded|failed) in (\\d+\\.?\\d*) seconds/",
    "options": {
      "caseSensitive": false,
      "debounce": 100
    }
  }
}

// Server -> Client
{
  "type": "pattern-registered",
  "patternId": "pattern-789",
  "requestId": "req-456"
}
```

### Step 3: Terminal Output Processing

```typescript
// In BufferManager when terminal outputs:
// "✨ Build succeeded in 12.5 seconds"

bufferManager.addData('session-123', '✨ Build succeeded in 12.5 seconds\n');

// EventManager.processData is called
eventManager.processData('session-123', '✨ Build succeeded in 12.5 seconds\n');

// RegexMatcher.match is called
const matcher = patterns.get('pattern-789');
const result = matcher.match(
  '✨ Build succeeded in 12.5 seconds\n',
  bufferContent
);

// Result:
{
  pattern: 'build-complete',
  match: 'Build succeeded in 12.5 seconds',
  position: 2,
  groups: {
    '1': 'succeeded',
    '2': '12.5'
  }
}
```

### Step 4: Event Broadcast

```javascript
// Server -> Client (WebSocket)
{
  "type": "terminal-event",
  "event": {
    "type": "pattern-match",
    "sessionId": "session-123",
    "timestamp": 1703789012345,
    "data": {
      "patternId": "pattern-789",
      "patternName": "build-complete",
      "match": "Build succeeded in 12.5 seconds",
      "position": 2,
      "groups": {
        "1": "succeeded",
        "2": "12.5"
      },
      "context": {
        "line": "✨ Build succeeded in 12.5 seconds",
        "lineNumber": 142
      }
    }
  }
}
```

### Step 5: Client Handles Event

```typescript
// Client subscription callback is triggered
eventService.subscribe(['pattern-match'], (event) => {
  if (event.data.patternName === 'build-complete') {
    const status = event.data.groups['1'];  // "succeeded"
    const time = event.data.groups['2'];    // "12.5"
    
    // Show notification
    showNotification({
      title: `Build ${status}!`,
      body: `Completed in ${time} seconds`,
      icon: status === 'succeeded' ? '✅' : '❌'
    });
    
    // Update UI
    setBuildStatus(status);
    setBuildTime(time);
  }
});
```

## Data Flow Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │         │  WebSocket  │         │   Server    │
│  (Browser)  │◄────────┤   Server    ├─────────┤  (Node.js)  │
└─────┬───────┘         └──────┬──────┘         └──────┬──────┘
      │                        │                        │
      │ 1. Register Pattern    │                        │
      ├───────────────────────►│                        │
      │                        ├───────────────────────►│
      │                        │                        │ 2. Create Matcher
      │                        │◄───────────────────────┤
      │ 3. Pattern Registered  │                        │
      │◄───────────────────────┤                        │
      │                        │                        │
      │                        │                        │ 4. Terminal Output
      │                        │                        │ "Build succeeded..."
      │                        │                        │
      │                        │                        │ 5. Pattern Matches!
      │                        │◄───────────────────────┤
      │ 6. Terminal Event      │                        │
      │◄───────────────────────┤                        │
      │                        │                        │
      │ 7. Show Notification   │                        │
      │                        │                        │
```

## Performance Considerations

For this example:
- Pattern matching: ~0.1ms for regex on 100-char string
- WebSocket latency: ~1-5ms on local network
- Total time from output to notification: ~10-20ms

## Error Handling

### Invalid Regex
```javascript
// Client sends invalid regex
{
  "type": "register-pattern",
  "config": {
    "type": "regex",
    "pattern": "[invalid(regex"  // Missing closing bracket
  }
}

// Server responds with error
{
  "type": "error",
  "error": "Invalid regular expression: /[invalid(regex/: Unterminated character class",
  "requestId": "req-456"
}
```

### Pattern Not Found
```javascript
// Client tries to unregister unknown pattern
{
  "type": "unregister-pattern",
  "patternId": "unknown-pattern"
}

// Server responds
{
  "type": "error",
  "error": "Pattern not found: unknown-pattern"
}
```

## Testing This Flow

```typescript
// Integration test
describe('Build Detection Flow', () => {
  it('should detect build completion and deliver event', async () => {
    // Setup
    const { server, client } = await createTestEnvironment();
    const session = await server.createSession('npm run build');
    
    // Register pattern
    const patternId = await client.registerPattern(session.id, {
      name: 'build-complete',
      type: 'regex',
      pattern: /Build succeeded in (\d+\.?\d*) seconds/
    });
    
    // Subscribe to events
    const events: TerminalEvent[] = [];
    client.subscribe(['pattern-match'], (event) => {
      events.push(event);
    });
    
    // Simulate build output
    session.write('✨ Build succeeded in 12.5 seconds\n');
    
    // Wait for event
    await waitFor(() => expect(events).toHaveLength(1));
    
    // Verify event
    expect(events[0].data.patternName).toBe('build-complete');
    expect(events[0].data.groups['1']).toBe('12.5');
  });
});
```