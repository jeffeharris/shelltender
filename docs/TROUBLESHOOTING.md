# Shelltender Troubleshooting Guide

## Common Integration Issues

### 1. SessionStore Initialization Error

**Symptom:**
```
TypeError: this.sessionStore.loadAllSessions is not a function
```

**Cause:** SessionStore hasn't been initialized before SessionManager tries to use it.

**Solution:**
```typescript
// Initialize SessionStore before creating SessionManager
const sessionStore = new SessionStore();
await sessionStore.initialize(); // CRITICAL: Wait for initialization
const sessionManager = new SessionManager(sessionStore);
```

### 2. No Terminal Output Despite WebSocket Connection

**Symptom:**
- WebSocket connects successfully
- Session is created
- Input is sent but no output is received

**Cause:** Missing PipelineIntegration setup which connects PTY output to WebSocket.

**Solution:**
```typescript
// Set up the integration to connect all components
const integration = new PipelineIntegration(
  pipeline,
  sessionManager,
  bufferManager,
  wsServer,
  sessionStore
);
integration.setup(); // CRITICAL: This connects PTY → WebSocket
```

### 3. Custom Session IDs Not Working

**Symptom:**
- You provide a custom session ID but get a UUID instead

**Cause:** SessionOptions didn't support custom IDs (fixed in v0.2.3+)

**Solution:**
```typescript
// Ensure you're using @shelltender/server v0.2.3 or later
const session = sessionManager.createSession({
  id: 'my-custom-id', // Will be used instead of generating UUID
  command: '/bin/bash'
});
```

### 4. Wrong Working Directory in Sessions

**Symptom:**
- Session created with specific `cwd` but shows different directory

**Cause:** SessionStore was saving `process.env.HOME` instead of actual cwd.

**Solution:** Update to v0.2.3+ which properly saves the working directory.

### 5. Zombie/Defunct Processes

**Symptom:**
- Multiple `[bash] <defunct>` processes accumulating

**Cause:** PTY processes not being properly cleaned up when sessions end.

**Solution:**
- Ensure you call `sessionManager.killSession(sessionId)` when done
- Set up proper signal handlers:

```typescript
process.on('SIGTERM', () => {
  integration.teardown();
  // Kill all sessions
  sessionManager.getAllSessions().forEach(session => {
    sessionManager.killSession(session.id);
  });
  process.exit(0);
});
```

## Integration Checklist

1. **Initialize in correct order:**
   ```typescript
   const bufferManager = new BufferManager();
   const sessionStore = new SessionStore();
   await sessionStore.initialize(); // Don't forget!
   const sessionManager = new SessionManager(sessionStore);
   ```

2. **Set up pipeline (recommended):**
   ```typescript
   const pipeline = new TerminalDataPipeline();
   ```

3. **Create WebSocket server:**
   ```typescript
   const wsServer = new WebSocketServer(port, sessionManager, bufferManager);
   ```

4. **Connect everything with PipelineIntegration:**
   ```typescript
   const integration = new PipelineIntegration(
     pipeline, sessionManager, bufferManager, wsServer, sessionStore
   );
   integration.setup(); // Critical!
   ```

## WebSocket Protocol

### Creating a Session
```javascript
// Request
{
  "type": "create",
  "options": {
    "id": "optional-custom-id",
    "command": "/bin/bash",
    "args": [],
    "cwd": "/home/user",
    "cols": 80,
    "rows": 24
  }
}

// Response
{
  "type": "created",
  "sessionId": "session-id",
  "session": { /* session details */ }
}
```

### Sending Input
```javascript
{
  "type": "input",
  "sessionId": "session-id",
  "data": "ls -la\n"
}
```

### Receiving Output
```javascript
{
  "type": "output",
  "sessionId": "session-id",
  "data": "terminal output here..."
}
```

## Debugging Tips

1. **Enable verbose logging:**
   ```typescript
   // SessionManager and WebSocketServer already include helpful logs
   // Look for [SessionManager] and [WebSocketServer] prefixed messages
   ```

2. **Check if PTY is alive:**
   ```typescript
   const processInfo = sessionManager['sessions'].get(sessionId);
   console.log('PTY PID:', processInfo?.pty.pid);
   ```

3. **Monitor data flow:**
   ```typescript
   sessionManager.onData((sessionId, data) => {
     console.log(`Data from session ${sessionId}:`, data);
   });
   ```

4. **Test with minimal example:**
   ```bash
   cd packages/server
   tsx examples/minimal-integration.ts
   ```

## Version History

- **v0.2.3**: Fixed SessionStore initialization, added custom session IDs, improved error handling
- **v0.2.2**: Initial release with potential initialization issues