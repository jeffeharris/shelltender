# Using Shelltender v0.6.0

This guide shows how to use the new simplified APIs introduced in v0.6.0.

## 🚀 Quick Start

### Option 1: Instant Server (One Line!)

```javascript
import { startShelltender } from '@shelltender/server';

// That's it! Server running on port 8080
await startShelltender(8080);
```

### Option 2: Server with Static Files

```javascript
import { createShelltenderServer } from '@shelltender/server';

const server = await createShelltenderServer({
  port: 8080,
  staticDir: 'public'  // Serve your HTML/CSS/JS files
});

console.log(`Server running at ${server.url}`);
```

### Option 3: Express Integration

```javascript
import express from 'express';
import { createShelltender } from '@shelltender/server';

const app = express();

// Add your routes
app.get('/api/data', (req, res) => res.json({ data: 'example' }));

// Add Shelltender in one line!
const shelltender = await createShelltender(app, { port: 8080 });
```

## 🎯 Client Usage

### React App (Zero Config)

```jsx
import { ShelltenderApp, QuickTerminal } from '@shelltender/client';
import '@xterm/xterm/css/xterm.css';  // Required!

function App() {
  return (
    <ShelltenderApp>
      <QuickTerminal />
    </ShelltenderApp>
  );
}
```

### Custom Terminal Setup

```jsx
import { WebSocketProvider, Terminal } from '@shelltender/client';
import '@xterm/xterm/css/xterm.css';

function App() {
  return (
    <WebSocketProvider config={{ url: '/ws' }}>
      <div style={{ height: '500px' }}>
        <Terminal
          sessionId="main"
          fontSize={14}
          theme="dark"
          onSessionCreated={(id) => console.log('Session:', id)}
        />
      </div>
    </WebSocketProvider>
  );
}
```

### Using the Unified Hook

```jsx
import { useShelltender } from '@shelltender/client';

function MyComponent() {
  const {
    sessions,
    activeSession,
    createSession,
    killSession,
    sendCommand,
    sendKey,
    output,
    isConnected
  } = useShelltender();

  const handleCreateSession = async () => {
    const sessionId = await createSession({
      cwd: '/home/user/projects'
    });
    console.log('Created session:', sessionId);
  };

  const handleRunCommand = () => {
    sendCommand('ls -la');  // Sends command with Enter
  };

  const handleCtrlC = () => {
    sendKey('ctrl-c');  // Send special keys
  };

  return (
    <div>
      <button onClick={handleCreateSession}>New Session</button>
      <button onClick={handleRunCommand}>List Files</button>
      <button onClick={handleCtrlC}>Stop Process</button>
      <pre>{output[activeSession] || 'No output yet'}</pre>
    </div>
  );
}
```

## 📦 Installation

```bash
# Server only
npm install @shelltender/server express

# Client only  
npm install @shelltender/client @xterm/xterm

# Both
npm install @shelltender/server @shelltender/client express @xterm/xterm
```

## 🔧 Configuration Options

### Server Configuration

```javascript
const server = await createShelltenderServer({
  // Port configuration
  port: 8080,              // or 'auto' for random port
  host: '0.0.0.0',         // Listen on all interfaces
  
  // WebSocket configuration
  wsPath: '/ws',           // WebSocket endpoint path
  
  // Static file serving
  staticDir: 'public',     // Directory to serve static files from
  
  // Session defaults
  sessionOptions: {
    defaultCwd: '/home/user',
    defaultEnv: {
      TERM: 'xterm-256color',
      CUSTOM_VAR: 'value'
    }
  },
  
  // Security
  enableSecurity: true,    // Enable security filters (default: true)
  
  // Advanced options
  defaultDirectory: (sessionId) => `/workspace/${sessionId}`,
  transformSessionConfig: async (config, sessionId) => {
    // Modify session config before creation
    return {
      ...config,
      env: { ...config.env, SESSION_ID: sessionId }
    };
  }
});
```

### Client Configuration

```jsx
<ShelltenderApp
  wsUrl="/ws"              // WebSocket URL (auto-detected by default)
  theme="dark"             // or "light"
  enableTabs={true}        // Show session tabs
  autoDetect={true}        // Auto-detect backend configuration
>
  <QuickTerminal 
    sessionId="main"       // Fixed session ID (optional)
    fontSize={14}
    cursorBlink={true}
    theme={{
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#00ff00'
    }}
  />
</ShelltenderApp>
```

## 🏗️ Common Patterns

### 1. Multi-Terminal Dashboard

```jsx
function Dashboard() {
  return (
    <ShelltenderApp enableTabs={true}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <QuickTerminal sessionId="terminal1" />
        <QuickTerminal sessionId="terminal2" />
      </div>
    </ShelltenderApp>
  );
}
```

### 2. Programmatic Control

```javascript
const server = await createShelltenderServer({ port: 8080 });

// Create a session programmatically
const session = server.shelltender.sessionManager.createSession({
  id: 'build-task',
  command: 'npm run build',
  cwd: '/project'
});

// Send commands
session.sendCommand('npm test');
session.sendKey('ctrl-c');  // Stop the test

// Monitor output
session.on('data', (data) => {
  console.log('Output:', data);
});

session.on('exit', () => {
  console.log('Session ended');
});
```

### 3. Custom Authentication

```javascript
const app = express();

// Add auth middleware
app.use('/api/shelltender', requireAuth);

// Add Shelltender with auth
const shelltender = await createShelltender(app, {
  port: 8080,
  transformSessionConfig: async (config, sessionId) => {
    const user = await getUserFromSession(sessionId);
    return {
      ...config,
      cwd: user.homeDirectory,
      env: { USER: user.username }
    };
  }
});
```

## 🐳 Docker Deployment

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  shelltender:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - SHELLTENDER_PORT=8080
```

## 🏥 Health Checks

v0.6.0 includes built-in health endpoints:

```bash
# Check server status
curl http://localhost:8080/api/health

# Get detailed diagnostics
curl http://localhost:8080/api/shelltender/doctor
```

## 🎮 Interactive Features

### Session Management

```javascript
// Get all sessions
const sessions = server.shelltender.sessionManager.getSessions();

// Kill a specific session
server.killSession('session-id');

// Broadcast to all sessions
server.broadcast({
  type: 'announcement',
  message: 'Server will restart in 5 minutes'
});

// Get active session count
const count = server.getActiveSessionCount();
```

### Event Handling

```javascript
// Listen for session events
server.shelltender.sessionManager.on('sessionCreated', (session) => {
  console.log('New session:', session.id);
});

server.shelltender.sessionManager.on('sessionEnded', (sessionId) => {
  console.log('Session ended:', sessionId);
});

// Listen for pattern matches
server.shelltender.eventManager.on('patternMatch', (event) => {
  if (event.pattern.name === 'npm-install-complete') {
    console.log('NPM install finished!');
  }
});
```

## 🚨 Common Issues

### Terminal shows nothing
Make sure you import the xterm CSS:
```javascript
import '@xterm/xterm/css/xterm.css';
```

### WebSocket connection fails
Check the health endpoint to see the correct WebSocket URL:
```bash
curl http://localhost:8080/api/health
```

### Session immediately exits
Check if the shell is available in the container:
```javascript
sessionOptions: {
  defaultShell: '/bin/bash',  // or '/bin/sh' for Alpine
}
```

## 📚 Full Example

```javascript
// server.js
import { createShelltenderServer } from '@shelltender/server';
import path from 'path';

const server = await createShelltenderServer({
  port: process.env.PORT || 8080,
  staticDir: path.join(import.meta.dirname, 'public'),
  sessionOptions: {
    defaultCwd: process.env.HOME || '/tmp'
  }
});

console.log(`
🍹 Shelltender Server Ready!

Web UI: ${server.url}
WebSocket: ${server.wsUrl}
Health: ${server.url}/api/health
`);

// Optional: Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await server.stop();
  process.exit(0);
});
```

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Shelltender Terminal</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.css">
  <style>
    body { margin: 0; background: #1e1e1e; }
    #terminal { height: 100vh; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script type="module">
    import { Terminal } from 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5/+esm';
    
    const terminal = new Terminal();
    terminal.open(document.getElementById('terminal'));
    
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'create', sessionId: 'web-terminal' }));
    };
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'output') {
        terminal.write(msg.data);
      }
    };
    
    terminal.onData(data => {
      ws.send(JSON.stringify({ type: 'input', sessionId: 'web-terminal', data }));
    });
  </script>
</body>
</html>
```

## 🎉 That's It!

With v0.6.0, setting up a terminal server is now incredibly simple. The automatic pipeline setup means no more black screens, and the convenience APIs mean less boilerplate code.

Happy coding! 🚀