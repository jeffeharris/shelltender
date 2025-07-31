# WebSocket Multi-Session Support

## Overview

Starting with the latest version, Shelltender's WebSocket server supports subscribing to multiple terminal sessions through a single WebSocket connection. This feature allows clients to efficiently manage multiple terminal sessions without the overhead of maintaining separate WebSocket connections for each session.

## How It Works

### Server-Side Changes

The WebSocket server now maintains a set of subscribed sessions for each client connection:

- Each client has a `sessionIds: Set<string>` instead of a single `sessionId`
- When connecting to a session, it's added to the client's subscription set
- Disconnecting from a session only removes that specific session from the set
- Output from all subscribed sessions is broadcast to the client

### Client Perspective

From the client's perspective, the WebSocket protocol remains unchanged:

```javascript
// Connect to first session
ws.send(JSON.stringify({
  type: 'connect',
  sessionId: 'session1'
}));

// Connect to second session (doesn't disconnect from first)
ws.send(JSON.stringify({
  type: 'connect', 
  sessionId: 'session2'
}));

// Client now receives output from both sessions
// Each message includes the sessionId to identify the source
```

## Benefits

1. **Reduced Connection Overhead**: Single WebSocket connection for all sessions
2. **Simplified State Management**: No need to juggle multiple WebSocket instances
3. **Better Performance**: Less network overhead and connection management
4. **Backward Compatible**: Existing single-session clients work unchanged

## Example Usage

```javascript
// Client subscribing to multiple sessions
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  // Connect to multiple sessions
  ['session1', 'session2', 'session3'].forEach(sessionId => {
    ws.send(JSON.stringify({
      type: 'connect',
      sessionId
    }));
  });
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  
  if (msg.type === 'output') {
    console.log(`Output from ${msg.sessionId}: ${msg.data}`);
    // Handle output based on which session it came from
  }
});

// Disconnect from a specific session
ws.send(JSON.stringify({
  type: 'disconnect',
  sessionId: 'session2'
}));
// Still receiving updates from session1 and session3
```

## Implementation Details

### Session Client Tracking

The server tracks which clients are subscribed to which sessions:

- `getSessionClientCount(sessionId)`: Returns number of clients connected to a session
- `getClientsBySession()`: Returns a map of all sessions and their client counts

### Incremental Updates

Multi-session support works seamlessly with incremental updates. Each session maintains its own sequence tracking per client, ensuring efficient data transmission even with multiple active sessions.

## Migration Guide

No client-side changes are required to support this feature. The enhancement is entirely server-side and backward compatible:

- Single-session clients continue to work as before
- Multi-session aware clients can connect to multiple sessions
- The WebSocket message protocol remains unchanged

## Troubleshooting

### Only receiving updates from the last connected session

This issue has been fixed. If you're experiencing this with an older version, upgrade to the latest version where proper multi-session support has been implemented.

### Session not receiving updates after reconnection

Ensure you're sending a `connect` message after reconnecting to re-subscribe to the session:

```javascript
ws.on('open', () => {
  // Re-subscribe to all sessions after reconnection
  savedSessionIds.forEach(sessionId => {
    ws.send(JSON.stringify({
      type: 'connect',
      sessionId
    }));
  });
});
```