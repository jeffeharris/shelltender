# PocketDev Update Guide: Using Incremental Updates

## Overview

Shelltender now supports incremental buffer updates to prevent duplicate terminal output when switching tabs or reconnecting. Here's how to update your DirectTerminal component to use this feature.

## Changes Required

### 1. Track Session State

Add state tracking for sequences and buffer status:

```typescript
// In your DirectTerminal component or a shared state manager
const sessionSequences = useRef<Map<string, number>>(new Map());
const hasReceivedInitialBuffer = useRef<Set<string>>(new Set());
```

### 2. Update Connection Logic

When connecting to a session, enable incremental updates:

```typescript
// When connecting/reconnecting to a session
const connectToSession = (sessionId: string) => {
  const lastSequence = sessionSequences.current.get(sessionId);
  
  ws.send(JSON.stringify({
    type: 'connect',
    sessionId: sessionId,
    useIncrementalUpdates: true,  // Enable the new feature
    lastSequence: lastSequence     // Send last known sequence (undefined is OK for first connect)
  }));
};
```

### 3. Handle Connection Responses

Update your message handler to handle both incremental and full buffer responses:

```typescript
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  
  switch (msg.type) {
    case 'connect':
      if (msg.incrementalData) {
        // Incremental update - just append new data
        terminal.write(msg.incrementalData);
        
        // Update sequence tracking
        if (msg.lastSequence !== undefined) {
          sessionSequences.current.set(sessionId, msg.lastSequence);
        }
      } else if (msg.scrollback) {
        // Full buffer - only clear/write if we haven't seen it before
        if (!hasReceivedInitialBuffer.current.has(sessionId)) {
          terminal.clear();
          terminal.write(msg.scrollback);
          hasReceivedInitialBuffer.current.add(sessionId);
        }
        
        // Update sequence tracking
        if (msg.lastSequence !== undefined) {
          sessionSequences.current.set(sessionId, msg.lastSequence);
        }
      }
      break;
      
    case 'output':
      terminal.write(msg.data);
      
      // Track sequence for future reconnects
      if (msg.sequence !== undefined) {
        sessionSequences.current.set(sessionId, msg.sequence);
      }
      break;
  }
});
```

### 4. Tab Switching

When switching between tabs, you no longer need to clear the terminal:

```typescript
const switchToTab = (sessionId: string) => {
  // Hide current terminal
  currentTerminal.style.display = 'none';
  
  // Show target terminal
  targetTerminal.style.display = 'block';
  
  // Connect with incremental updates
  connectToSession(sessionId);
  // The terminal will only receive new data since last sequence!
};
```

### 5. Command Execution via API

When executing commands via your API, use the existing WebSocket connection instead of creating new ones:

```typescript
// Instead of creating a new WebSocket connection:
// const ws = new WebSocket(...);
// ws.send({ type: 'input', ... });
// ws.close();

// Use the existing connection:
existingWs.send(JSON.stringify({
  type: 'input',
  sessionId: sessionId,
  data: command + '\n'
}));
```

## Benefits

1. **No Duplicate Output**: Terminal buffers won't be replayed on tab switches
2. **Faster Tab Switching**: Only new data is transmitted
3. **Network Efficient**: Reduces bandwidth usage
4. **Seamless Experience**: Users won't see content flash or duplicate

## Backward Compatibility

The changes are fully backward compatible. If you don't send `useIncrementalUpdates: true`, Shelltender will use the old behavior (always send full buffer).

## Testing

Test these scenarios:
1. Create multiple terminals with unique output
2. Switch between tabs rapidly - output should appear only once
3. Execute commands via API - no duplicates
4. Disconnect/reconnect network - only new output appears

## Example: Updated DirectTerminal

```typescript
export const DirectTerminal = memo(({
  dbSessionId,
  shelltenderSessionId,
  isVisible,
  onSessionStatus
}) => {
  const terminalRef = useRef();
  const wsRef = useRef();
  const sequencesRef = useRef(new Map());
  const hasBufferRef = useRef(new Set());
  
  useEffect(() => {
    if (isVisible && wsRef.current && shelltenderSessionId) {
      const lastSeq = sequencesRef.current.get(shelltenderSessionId);
      
      wsRef.current.send(JSON.stringify({
        type: 'connect',
        sessionId: shelltenderSessionId,
        useIncrementalUpdates: true,
        lastSequence: lastSeq
      }));
    }
  }, [isVisible, shelltenderSessionId]);
  
  // ... rest of component
});
```

## Questions?

The Shelltender team is happy to help with the migration. The key insight is that by tracking sequence numbers, we can avoid re-sending data the client already has, eliminating the duplicate output issue entirely.