# @shelltender/server

Server-side terminal session management for Shelltender. This package provides robust backend components for creating and managing persistent web-based terminal sessions with features like session persistence, buffer management, and security restrictions.

## Installation

```bash
npm install @shelltender/server
```

Note: This package has a peer dependency on `express` for HTTP server integration.

## Quick Start

```typescript
import { SessionManager, WebSocketServer, BufferManager, SessionStore } from '@shelltender/server';

// Initialize components
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(bufferManager, sessionStore);

// Start WebSocket server
const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);

// Create a session
const session = sessionManager.createSession({
  command: '/bin/bash',
  cwd: process.env.HOME,
  cols: 80,
  rows: 24
});

console.log(`Session created: ${session.id}`);
```

## Core Components

### SessionManager

The heart of the server package, managing terminal session lifecycles.

```typescript
const sessionManager = new SessionManager(bufferManager, sessionStore);

// Create a new session
const session = sessionManager.createSession({
  command: '/bin/zsh',
  args: ['--login'],
  cwd: '/home/user',
  env: { TERM: 'xterm-256color' },
  cols: 120,
  rows: 40
});

// Send commands
sessionManager.sendCommand(session.id, 'ls -la');
sessionManager.sendKey(session.id, 'ctrl-c');
sessionManager.sendRawInput(session.id, 'Hello World');

// Manage session
sessionManager.resizeSession(session.id, 80, 24);
sessionManager.killSession(session.id);
```

#### Key Methods
- `createSession(options)` - Create a new terminal session
- `getSession(sessionId)` - Retrieve an existing session
- `sendCommand(sessionId, command)` - Send a command with newline
- `sendRawInput(sessionId, data)` - Send raw input without modification
- `sendKey(sessionId, key)` - Send special key sequences
- `resizeSession(sessionId, cols, rows)` - Resize terminal dimensions
- `killSession(sessionId)` - Terminate a session
- `getAllSessions()` - Get all active sessions

#### Special Key Support
```typescript
// Supported special keys
sessionManager.sendKey(sessionId, 'ctrl-c');    // Interrupt
sessionManager.sendKey(sessionId, 'ctrl-d');    // EOF
sessionManager.sendKey(sessionId, 'ctrl-z');    // Suspend
sessionManager.sendKey(sessionId, 'ctrl-l');    // Clear
sessionManager.sendKey(sessionId, 'ctrl-r');    // Reverse search
sessionManager.sendKey(sessionId, 'ctrl-a');    // Beginning of line
sessionManager.sendKey(sessionId, 'ctrl-e');    // End of line
sessionManager.sendKey(sessionId, 'tab');       // Tab completion
sessionManager.sendKey(sessionId, 'escape');    // Escape
sessionManager.sendKey(sessionId, 'up');        // Arrow keys
sessionManager.sendKey(sessionId, 'down');
sessionManager.sendKey(sessionId, 'left');
sessionManager.sendKey(sessionId, 'right');
```

### BufferManager

Maintains scrollback buffers for session history.

```typescript
const bufferManager = new BufferManager(100000); // 100KB max per session

// Buffer is automatically managed by SessionManager
// Direct access for advanced use cases:
const buffer = bufferManager.getBuffer(sessionId);
bufferManager.clearBuffer(sessionId);
```

#### Configuration
- `maxBufferSize` - Maximum characters per session (default: 100,000)

### SessionStore

Provides disk persistence for sessions.

```typescript
const sessionStore = new SessionStore('.sessions'); // Custom path

// Sessions are automatically persisted by SessionManager
// Direct access for advanced use cases:
await sessionStore.saveSession(sessionId, session, buffer);
const restored = await sessionStore.loadSession(sessionId);
const allSessions = await sessionStore.loadAllSessions();
```

#### Features
- Automatic session persistence on state changes
- Session restoration on server restart
- Buffer updates saved incrementally
- JSON-based storage format

### RestrictedShell

Create sandboxed terminal sessions with security restrictions.

```typescript
const session = sessionManager.createSession({
  // Filesystem restrictions
  restrictToPath: '/home/demo/sandbox',
  allowUpwardNavigation: false,
  
  // Command restrictions
  blockedCommands: ['rm', 'dd', 'mkfs', 'sudo'],
  
  // Read-only mode
  readOnlyMode: true,
  
  // Custom prompt
  env: {
    PS1: 'sandbox> '
  }
});
```

#### Security Features
- **Path Restriction** - Confine session to specific directory
- **Command Blocking** - Prevent dangerous commands
- **Read-Only Mode** - Block all write operations
- **Navigation Control** - Prevent upward directory traversal

### WebSocketServer

Handles real-time communication with web clients.

```typescript
const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);

// Server handles these message types automatically:
// - create: Create new session
// - connect: Connect to existing session
// - input: Send terminal input
// - resize: Resize terminal
// - disconnect: Disconnect from session
```

## Advanced Usage

### Creating a Restricted Demo Environment

```typescript
const demoSession = sessionManager.createSession({
  restrictToPath: '/opt/demo',
  blockedCommands: ['rm', 'mv', 'cp', 'dd', 'sudo', 'su'],
  readOnlyMode: false,
  allowUpwardNavigation: false,
  env: {
    PS1: '\\u@demo:\\w$ ',
    TERM: 'xterm-256color'
  },
  cwd: '/opt/demo',
  locked: true  // Prevent further modifications
});
```

### Monitoring Session Events

```typescript
sessionManager.on('sessionCreated', (session) => {
  console.log(`New session: ${session.id}`);
});

sessionManager.on('sessionOutput', (sessionId, data) => {
  // Process output (e.g., detect patterns)
  if (data.includes('ERROR')) {
    console.log(`Error detected in session ${sessionId}`);
  }
});

sessionManager.on('sessionExit', (sessionId, exitCode) => {
  console.log(`Session ${sessionId} exited with code ${exitCode}`);
});
```

### Custom Session Commands

```typescript
// Run a specific command instead of a shell
const pythonRepl = sessionManager.createSession({
  command: '/usr/bin/python3',
  args: ['-i'],
  env: {
    PYTHONUNBUFFERED: '1'
  }
});

// Run a Node.js REPL
const nodeRepl = sessionManager.createSession({
  command: 'node',
  args: ['--interactive']
});
```

### Session Persistence and Recovery

```typescript
// Load previously saved sessions on startup
async function restoreSessions() {
  const savedSessions = await sessionStore.loadAllSessions();
  
  for (const [sessionId, data] of savedSessions) {
    // Recreate session with saved state
    const session = sessionManager.createSession({
      ...data.session,
      // Restore to saved directory
      cwd: data.cwd || data.session.cwd
    });
    
    // Restore buffer content
    bufferManager.addToBuffer(session.id, data.buffer);
  }
}

// Clean up old sessions
await sessionStore.deleteAllSessions();
```

## Integration with Express

```typescript
import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Serve terminal UI
app.use(express.static('public'));

// REST endpoints for session management
app.get('/api/sessions', (req, res) => {
  res.json(sessionManager.getAllSessions());
});

app.post('/api/sessions', (req, res) => {
  const session = sessionManager.createSession(req.body);
  res.json(session);
});

app.delete('/api/sessions/:id', (req, res) => {
  sessionManager.killSession(req.params.id);
  res.sendStatus(204);
});

server.listen(3000);
```

## Best Practices

### Security
- Always use HTTPS/WSS in production
- Implement authentication before session creation
- Use RestrictedShell for untrusted users
- Set resource limits (CPU, memory) for PTY processes
- Validate and sanitize all user inputs

### Performance
- Set appropriate buffer sizes based on expected usage
- Implement session timeouts for idle connections
- Monitor system resources and set session limits
- Use session persistence selectively for important sessions

### Error Handling
```typescript
try {
  const session = sessionManager.createSession(options);
} catch (error) {
  console.error('Failed to create session:', error);
  // Handle error appropriately
}

// Monitor for session errors
sessionManager.on('sessionError', (sessionId, error) => {
  console.error(`Session ${sessionId} error:`, error);
});
```

## Examples

See the [demo app](../../apps/demo) for a complete working example of all features.

## API Reference

For detailed API documentation of all classes and methods, see the [TypeScript definitions](./dist/index.d.ts) or generate docs with:

```bash
npm run docs
```

## Related Packages

- [@shelltender/core](../core) - Shared types and interfaces
- [@shelltender/client](../client) - React components for the frontend
- [shelltender](../shelltender) - All-in-one package

## License

MIT