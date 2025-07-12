# Shelltender v0.6.0 Quick Start Guide

Get a persistent web terminal running in under 5 minutes!

## What is Shelltender?

Shelltender is a web-based terminal that:
- **Persists sessions** - Terminal sessions survive browser refreshes
- **Supports multiple tabs** - Run multiple terminals simultaneously  
- **Works everywhere** - Any modern browser, including mobile
- **Zero dependencies** - No database or external services required

## Installation

```bash
npm install @shelltender/server @shelltender/client
```

## Minimal Server Setup

Create `server.js`:

```javascript
import { createShelltenderServer } from '@shelltender/server';

const { url } = await createShelltenderServer({ 
  port: 8085,
  staticDir: './public'  // Optional: serve your frontend
});

console.log(`Server running at ${url}`);
```

That's it! Run with:
```bash
node server.js
```

## React Client Setup

Create your React app:

```jsx
import React from 'react';
import { ShelltenderApp, Terminal, SessionTabs, useShelltender } from '@shelltender/client';
import '@xterm/xterm/css/xterm.css';
import '@shelltender/client/styles.css';

function App() {
  return (
    <ShelltenderApp wsUrl="/ws">
      <TerminalWithTabs />
    </ShelltenderApp>
  );
}

function TerminalWithTabs() {
  const { 
    sessions, 
    activeSession, 
    createSession, 
    killSession, 
    switchSession 
  } = useShelltender();
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SessionTabs
        sessions={sessions}
        currentSessionId={activeSession}
        onSelectSession={switchSession}
        onNewSession={() => createSession()}
        onCloseSession={killSession}
        onShowSessionManager={() => {}}
      />
      {activeSession && <Terminal sessionId={activeSession} />}
    </div>
  );
}

export default App;
```

## Key Concepts

### 1. Single Port Architecture
Both HTTP and WebSocket run on the same port. The server automatically upgrades `/ws` requests to WebSocket.

### 2. Session Management
- Sessions are identified by unique IDs
- Sessions persist on the server even when no clients are connected
- Reconnecting clients automatically restore their sessions

### 3. The `useShelltender` Hook
Provides all terminal state and actions:
```javascript
const {
  sessions,        // Array of active sessions
  activeSession,   // Currently selected session ID
  createSession,   // Create new terminal session
  killSession,     // Terminate a session
  switchSession,   // Switch active session
  isConnected     // WebSocket connection status
} = useShelltender();
```

## Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8085
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t my-terminal .
docker run -p 8085:8085 my-terminal
```

## Advanced Configuration

### Server Options

```javascript
await createShelltenderServer({
  port: 8085,
  host: '0.0.0.0',           // Bind address
  shellCommand: '/bin/bash',  // Shell to use
  shellArgs: ['-l'],         // Shell arguments  
  env: {                     // Environment variables
    TERM: 'xterm-256color',
    PS1: '\\u@\\h:\\w\\$ '
  },
  sessionTimeout: 3600000,   // 1 hour timeout
  maxSessions: 100,          // Max concurrent sessions
  restrictedMode: false,     // Enable filesystem restrictions
  allowedPaths: ['/tmp'],    // Paths accessible in restricted mode
  staticDir: './public'      // Serve static files
});
```

### Client Styling

The Terminal component accepts style props:

```jsx
<Terminal
  sessionId={activeSession}
  fontSize={14}
  fontFamily="Monaco, monospace"
  theme={{
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff'
  }}
  padding={{ left: 10, right: 10 }}
/>
```

## Common Patterns

### Auto-create First Session

```jsx
useEffect(() => {
  if (isConnected && sessions.length === 0) {
    createSession();
  }
}, [isConnected, sessions.length]);
```

### Custom WebSocket URL

For production with reverse proxy:

```jsx
<ShelltenderApp wsUrl="wss://myapp.com/terminal/ws">
  {/* ... */}
</ShelltenderApp>
```

### Programmatic Input

Send commands from your app:

```javascript
const { service } = useShelltender();

// Send a command
service.send({
  type: 'input',
  sessionId: activeSession,
  data: 'ls -la\n'
});
```

## Troubleshooting

### Sessions Don't Persist
- Check that `sessions.json` is writable
- Ensure the server process isn't restarting

### Blank Terminal
- Verify WebSocket connection in browser DevTools
- Check that `/ws` endpoint is accessible
- Ensure styles are imported correctly

### Tab Styling Issues
- Import `@shelltender/client/styles.css`
- The package requires these styles for proper rendering

## Next Steps

- Check out the [full documentation](https://github.com/jeffh/shelltender)
- See the [demo application](../minimal-demo/) for a complete example
- Explore [mobile support](./MOBILE.md) for touch gestures
- Learn about [security features](./SECURITY.md) for production use

## Need Help?

- [GitHub Issues](https://github.com/jeffh/shelltender/issues)
- [API Reference](./API.md)
- [Migration Guide](./MIGRATION.md) from v0.5.0