# Session Auto-Creation Planning Document

## Current Behavior Analysis

### Overview
Currently, when a WebSocket client attempts to connect to a non-existent session, the `handleConnectSession` method in `WebSocketServer.ts` returns an error:

```typescript
// Line 142-168 in WebSocketServer.ts
private handleConnectSession(clientId: string, ws: any, data: any): void {
  if (!data.sessionId) {
    ws.send(JSON.stringify({
      type: 'error',
      data: 'Session ID required',
    }));
    return;
  }

  const session = this.sessionManager.getSession(data.sessionId);
  if (session) {
    // Successfully connect to existing session
    this.sessionManager.addClient(data.sessionId, clientId);
    ws.sessionId = data.sessionId;
    
    ws.send(JSON.stringify({
      type: 'connect',
      sessionId: data.sessionId,
      session,
      scrollback: this.bufferManager.getBuffer(data.sessionId),
    }));
  } else {
    // Session not found - returns error
    ws.send(JSON.stringify({
      type: 'error',
      data: 'Session not found',
    }));
  }
}
```

### Current Session Creation Flow
1. Client sends a `create` message type to create a new session
2. Server creates session with `SessionManager.createSession(options)`
3. Server returns session ID to client
4. Client then sends `connect` message with the session ID
5. If session doesn't exist during connect, error is returned

## Proposed Implementation Approach

### Design Goals
- Opt-in feature to maintain backward compatibility
- Configurable at both server and per-connection level
- Secure by default with appropriate restrictions
- Minimal changes to existing codebase

### Implementation Strategy

#### 1. Server Configuration
Add server-level configuration option to enable auto-creation:

```typescript
interface WebSocketServerConfig {
  port: number;
  autoCreateSessions?: boolean;
  defaultSessionOptions?: SessionOptions;
}

export class WebSocketServer {
  private config: WebSocketServerConfig;
  
  constructor(
    config: WebSocketServerConfig | number, // Allow backward compatibility
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore
  ) {
    // Handle both old and new constructor signatures
    this.config = typeof config === 'number' 
      ? { port: config } 
      : config;
    // ... rest of initialization
  }
}
```

#### 2. Enhanced Connect Message
Allow clients to specify auto-creation preferences:

```typescript
interface ConnectMessage {
  type: 'connect';
  sessionId: string;
  autoCreate?: boolean;           // Client-level opt-in
  sessionOptions?: SessionOptions; // Options for auto-created session
}
```

#### 3. Modified handleConnectSession Implementation

```typescript
private handleConnectSession(clientId: string, ws: any, data: ConnectMessage): void {
  if (!data.sessionId) {
    ws.send(JSON.stringify({
      type: 'error',
      data: 'Session ID required',
    }));
    return;
  }

  let session = this.sessionManager.getSession(data.sessionId);
  
  // Auto-create logic
  if (!session && this.shouldAutoCreateSession(data)) {
    try {
      const options = this.buildSessionOptions(data);
      session = this.sessionManager.createSession(options);
      
      // Send auto-created notification
      ws.send(JSON.stringify({
        type: 'session-auto-created',
        sessionId: session.id,
        session,
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        data: `Failed to auto-create session: ${error.message}`,
      }));
      return;
    }
  }
  
  if (session) {
    this.sessionManager.addClient(data.sessionId, clientId);
    ws.sessionId = data.sessionId;
    
    ws.send(JSON.stringify({
      type: 'connect',
      sessionId: data.sessionId,
      session,
      scrollback: this.bufferManager.getBuffer(data.sessionId),
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      data: 'Session not found',
    }));
  }
}

private shouldAutoCreateSession(data: ConnectMessage): boolean {
  // Check both server config and client request
  return (this.config.autoCreateSessions === true && data.autoCreate !== false) ||
         (data.autoCreate === true);
}

private buildSessionOptions(data: ConnectMessage): SessionOptions {
  // Merge default options with client-provided options
  const defaults = this.config.defaultSessionOptions || {};
  const clientOptions = data.sessionOptions || {};
  
  return {
    ...defaults,
    ...clientOptions,
    id: data.sessionId, // Ensure the requested ID is used
  };
}
```

## Configuration Options

### Server-Level Configuration

```typescript
// Example server setup with auto-creation enabled
const wsServer = new WebSocketServer({
  port: 8080,
  autoCreateSessions: true, // Enable auto-creation
  defaultSessionOptions: {
    // Default options for auto-created sessions
    cols: 80,
    rows: 24,
    restrictToPath: '/app/sandbox', // Security: restrict filesystem access
    blockedCommands: ['sudo', 'su', 'shutdown'], // Security: block dangerous commands
  }
}, sessionManager, bufferManager);
```

### Client-Level Control

```typescript
// Client can opt-in even if server doesn't have it enabled by default
const connectMessage = {
  type: 'connect',
  sessionId: 'my-custom-session-id',
  autoCreate: true,
  sessionOptions: {
    cols: 120,
    rows: 40,
    command: '/bin/zsh', // Custom shell
    env: {
      CUSTOM_VAR: 'value'
    }
  }
};
```

### Environment Variables

Support environment variable configuration for containerized deployments:

```bash
SHELLTENDER_AUTO_CREATE_SESSIONS=true
SHELLTENDER_DEFAULT_SESSION_COLS=80
SHELLTENDER_DEFAULT_SESSION_ROWS=24
SHELLTENDER_DEFAULT_RESTRICT_PATH=/app/sandbox
```

## Security Considerations

### 1. Authentication and Authorization
- Auto-creation should respect any existing authentication mechanisms
- Consider adding a separate permission for auto-creation capability
- Monitor mode clients should not be able to auto-create sessions

### 2. Resource Limits
- Implement rate limiting for auto-creation to prevent DoS attacks
- Consider maximum sessions per client/IP
- Add memory/CPU monitoring for session creation

### 3. Default Restrictions
- Auto-created sessions should be restricted by default
- Use `restrictToPath` to limit filesystem access
- Block dangerous commands via `blockedCommands`
- Consider read-only mode for untrusted contexts

### 4. Session ID Validation
- Validate session ID format to prevent injection attacks
- Consider UUID-only mode for auto-created sessions
- Implement maximum session ID length

### 5. Audit Logging
- Log all auto-creation attempts
- Include client information and requested options
- Monitor for suspicious patterns

## Code Examples

### Server Setup with Auto-Creation

```typescript
import { WebSocketServer, SessionManager, BufferManager } from '@shelltender/server';

// Configure with auto-creation enabled
const wsServer = new WebSocketServer({
  port: 8080,
  autoCreateSessions: true,
  defaultSessionOptions: {
    // Security-first defaults
    restrictToPath: process.env.SANDBOX_PATH || '/tmp/sandbox',
    blockedCommands: ['sudo', 'su', 'rm', 'shutdown', 'reboot'],
    readOnlyMode: process.env.READ_ONLY === 'true',
    cols: 80,
    rows: 24,
  }
}, sessionManager, bufferManager);
```

### Client Usage

```typescript
// Client requests auto-creation
const ws = new WebSocket('ws://localhost:8080');

ws.send(JSON.stringify({
  type: 'connect',
  sessionId: 'user-123-session',
  autoCreate: true,
  sessionOptions: {
    cwd: '/home/user/projects',
    env: {
      PROJECT_ENV: 'development'
    }
  }
}));

// Handle auto-creation response
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'session-auto-created') {
    console.log('Session was auto-created:', message.session);
  }
});
```

### Backward Compatibility

The implementation maintains full backward compatibility:

1. Existing WebSocketServer constructor with port number still works
2. Clients not sending `autoCreate` flag will get current behavior
3. No changes required for existing client code
4. Server admins can enable feature without client changes

## Migration Path

### Phase 1: Add Feature (v0.5.0)
- Implement auto-creation as opt-in feature
- Default to disabled for backward compatibility
- Add comprehensive logging

### Phase 2: Enable in Demo (v0.4.7)
- Enable auto-creation in demo app
- Gather feedback and usage patterns
- Refine security defaults

### Phase 3: Production Ready (v0.5.0)
- Document best practices
- Add rate limiting and resource controls
- Consider making it default for new installations

## Testing Considerations

1. **Unit Tests**
   - Test auto-creation logic in isolation
   - Verify security restrictions are applied
   - Test option merging behavior

2. **Integration Tests**
   - Test full flow from client connect to session creation
   - Verify backward compatibility
   - Test error scenarios

3. **Security Tests**
   - Attempt to bypass restrictions
   - Test resource exhaustion scenarios
   - Verify audit logging

## Alternative Approaches Considered

1. **Separate Auto-Create Endpoint**
   - Pros: Clear separation of concerns
   - Cons: More complex client implementation

2. **Implicit Creation on First Input**
   - Pros: Transparent to client
   - Cons: Unclear behavior, potential security issues

3. **HTTP API for Creation**
   - Pros: RESTful approach
   - Cons: Requires HTTP client in addition to WebSocket

The chosen approach (enhanced connect message) provides the best balance of simplicity, security, and backward compatibility.