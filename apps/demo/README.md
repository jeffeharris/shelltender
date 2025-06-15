# Shelltender Demo Application

A complete demonstration of the Shelltender web-based persistent terminal system, showcasing how to integrate all Shelltender packages into a working application.

## Overview

This demo application provides a fully-functional web-based terminal with:
- Multiple terminal sessions in tabs
- Persistent sessions that survive browser closure
- Session management UI
- Real-time terminal updates via WebSocket
- Clean, modern interface built with React and Tailwind CSS

## Features Demonstrated

- ✅ **Persistent Sessions** - Terminal sessions continue running on the server
- ✅ **Multi-Tab Interface** - Open multiple terminals simultaneously
- ✅ **Session Manager** - View and manage all sessions (open and backgrounded)
- ✅ **Auto-Reconnection** - Seamlessly reconnect to existing sessions
- ✅ **Real-time Updates** - Instant terminal output via WebSocket
- ✅ **Responsive Design** - Works on desktop and tablet devices
- ✅ **Session Lifecycle** - Create, switch, background, and kill sessions

## Quick Start

```bash
# From the demo directory
cd apps/demo
npm install
npm run dev
```

This will start:
- Backend server on http://localhost:3000
- WebSocket server on ws://localhost:8282
- Frontend development server with hot reload

Open http://localhost:3000 in your browser to see the demo.

## Architecture

### Backend Server (`src/server/index.ts`)

```typescript
// Key components initialized
const bufferManager = new BufferManager();
const sessionStore = new SessionStore('.sessions');
const sessionManager = new SessionManager(bufferManager, sessionStore);
const wsServer = new WebSocketServer(8282, sessionManager, bufferManager);

// REST API endpoints
app.get('/api/sessions')       // List all sessions
app.delete('/api/sessions/:id') // Kill a session
app.get('/api/health')         // Health check
```

### Frontend Client (`src/App.tsx`)

```typescript
// Main components used
<SessionTabs />      // Tab bar for switching sessions
<Terminal />         // xterm.js terminal component
<SessionManager />   // Modal for managing all sessions
```

## Code Structure

```
apps/demo/
├── src/
│   ├── server/
│   │   └── index.ts        # Express server with WebSocket
│   ├── client/
│   │   └── App.tsx         # React application
│   └── main.tsx            # React entry point
├── public/                 # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite bundler configuration
```

## Key Implementation Details

### Creating Sessions

```typescript
// New session is created when Terminal mounts with no sessionId
<Terminal 
  sessionId={currentSessionId}
  onSessionCreated={(sessionId) => {
    // Update local state and UI
    fetchSessions();
  }}
/>
```

### Managing Tabs

```typescript
// Tabs show only open sessions
const openSessions = sessions.filter(s => openTabs.includes(s.id));

<SessionTabs
  sessions={openSessions}
  currentSessionId={currentSessionId}
  onSelectSession={setCurrentSessionId}
  onCloseSession={handleCloseTab}  // Just removes from tabs
  onShowSessionManager={() => setShowSessionManager(true)}
/>
```

### Background Sessions

Sessions closed from tabs remain running on the server and can be reopened:

```typescript
// In SessionManager modal
const backgroundedSessions = sessions.filter(
  s => !openTabs.includes(s.id)
);

// Click to reopen
onOpenSession={(sessionId) => {
  setOpenTabs([...openTabs, sessionId]);
  setCurrentSessionId(sessionId);
}}
```

### Killing Sessions

```typescript
// Permanently terminate a session
const handleKillSession = async (sessionId: string) => {
  await fetch(`/api/sessions/${sessionId}`, { 
    method: 'DELETE' 
  });
  // Remove from all state
  fetchSessions();
  handleCloseTab(sessionId);
};
```

## Using as a Template

This demo is designed to be a starting point for your own applications.

### 1. Copy the Demo

```bash
cp -r apps/demo /path/to/your/app
cd /path/to/your/app
npm install
```

### 2. Customize the Server

Add authentication, custom routes, or configuration:

```typescript
// Add authentication middleware
app.use('/api/sessions', requireAuth);

// Add custom session options
const session = sessionManager.createSession({
  restrictToPath: '/workspace',
  env: { 
    CUSTOM_VAR: 'value' 
  }
});
```

### 3. Customize the UI

Modify the React components or add new features:

```typescript
// Add session titles
const [sessionTitles, setSessionTitles] = useState({});

// Add custom toolbar
<Toolbar>
  <button onClick={clearTerminal}>Clear</button>
  <button onClick={downloadLogs}>Download</button>
</Toolbar>
```

### 4. Add Features

Common enhancements you might add:

- **Authentication**: Protect session creation/access
- **Session Sharing**: Allow multiple users to view same session
- **Command Restrictions**: Use RestrictedShell for sandboxing
- **Custom Themes**: Override terminal colors and fonts
- **Keyboard Shortcuts**: Add hotkeys for navigation
- **Session Recording**: Save and replay terminal sessions

## Configuration

### Environment Variables

```bash
PORT=3000              # HTTP server port
WS_PORT=8282          # WebSocket server port
SESSION_STORE=.sessions # Session persistence directory
```

### Build Configuration

The demo uses Vite for fast development and optimized production builds:

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

## Deployment

### Production Considerations

1. **Security**: 
   - Use HTTPS and WSS
   - Implement authentication
   - Validate all inputs
   - Set resource limits

2. **Performance**:
   - Limit concurrent sessions
   - Configure buffer sizes
   - Add session timeouts
   - Use CDN for static assets

3. **Reliability**:
   - Add health checks
   - Implement graceful shutdown
   - Use process manager (PM2, systemd)
   - Add monitoring/logging

### Example Nginx Configuration

```nginx
server {
  listen 443 ssl http2;
  server_name terminal.example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
  }

  location /ws {
    proxy_pass http://localhost:8282;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if port 8282 is available
   - Ensure WebSocket server is running
   - Verify no firewall blocking

2. **Sessions Not Persisting**
   - Check write permissions for `.sessions` directory
   - Verify SessionStore is initialized
   - Check server logs for errors

3. **Terminal Not Displaying**
   - Ensure all CSS is loaded
   - Check browser console for errors
   - Verify WebSocket connection established

## Further Examples

### Adding Restricted Sessions

```typescript
// In server/index.ts
app.post('/api/sessions/sandbox', (req, res) => {
  const session = sessionManager.createSession({
    restrictToPath: '/tmp/sandbox',
    blockedCommands: ['rm', 'sudo'],
    readOnlyMode: true
  });
  res.json(session);
});
```

### Custom Terminal Themes

```css
/* In App.css */
.xterm {
  background-color: #1e1e1e;
  font-family: 'Fira Code', monospace;
}

.xterm-cursor {
  background-color: #ff79c6;
}
```

### Session Events

```typescript
// Listen for patterns in output
sessionManager.on('sessionOutput', (sessionId, data) => {
  if (data.includes('ERROR')) {
    notifyUser(`Error in session ${sessionId}`);
  }
});
```

## Contributing

Feel free to use this demo as a starting point and contribute improvements back to the main Shelltender repository.

## License

MIT