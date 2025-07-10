# Shelltender Migration Guide

## Migrating from v0.4.x to v0.5.0

### Breaking Changes

#### 1. Single Port Mode is Now Default

**Before (v0.4.x):**
- HTTP API: Port 3000
- WebSocket: Port 8080 (separate server)

**After (v0.5.0):**
- HTTP + WebSocket: Port 8080 (single server, configurable via PORT env)
- WebSocket available at `/ws` path on the same port

**Migration Options:**

Option A - Update to single port mode (recommended):
```bash
# Update your environment configuration
PORT=8080  # Single port for both HTTP and WebSocket

# Update Docker/deployment configs to expose only port 8080
```

Option B - Keep dual port mode:
```bash
# Set environment variable to disable single port mode
SINGLE_PORT=false
PORT=3000
WS_PORT=8080
```

#### 2. WebSocket Path Change

**Before:** WebSocket connects directly to `ws://localhost:8080`

**After:** WebSocket connects to `ws://localhost:8080/ws`

The client automatically detects the server mode, but if you have custom WebSocket clients:
```javascript
// Old
const ws = new WebSocket('ws://localhost:8080');

// New (single port mode)
const ws = new WebSocket('ws://localhost:8080/ws');
```

### New Features

#### 1. Unified Server Support

WebSocketServer can now attach to existing HTTP servers:

```typescript
import { createServer } from 'http';
import express from 'express';
import { WebSocketServer } from '@shelltender/server';

const app = express();
const server = createServer(app);

// New: Attach to existing server
const wsServer = WebSocketServer.create(
  { server },  // Pass server instead of port
  sessionManager,
  bufferManager
);

server.listen(8080);  // Single port for everything!
```

#### 2. Improved Connection State Management

The `useWebSocket` hook now provides the WebSocket service immediately:

```typescript
// No more "WebSocket service not available" errors!
const { wsService, isConnected } = useWebSocket();
// wsService is always available from first render
```

#### 3. WebSocketServer Factory Method

New `create()` factory method for flexible server creation:

```typescript
// Option 1: Standalone server (port number)
const wsServer = WebSocketServer.create(8080, sessionManager, bufferManager);

// Option 2: Attach to existing HTTP server
const wsServer = WebSocketServer.create(
  { 
    server: httpServer,  // Your express/http server
    path: '/ws'          // Optional, defaults to '/ws'
  },
  sessionManager,
  bufferManager
);
```

### Step-by-Step Migration

#### For Docker Users

1. Update `docker-compose.yml`:
```yaml
# Before
ports:
  - "3000:3000"
  - "8080:8080"

# After
ports:
  - "8080:8080"
```

2. Update environment variables:
```yaml
environment:
  - PORT=8080
  # Remove WS_PORT, no longer needed in single port mode
```

#### For Kubernetes Users

1. Update Service definition:
```yaml
# Before
spec:
  ports:
  - name: http
    port: 3000
  - name: websocket
    port: 8080

# After
spec:
  ports:
  - name: http
    port: 8080
```

2. Update Ingress/proxy configurations to route `/ws` to the same backend

#### For Local Development

1. Update `.env`:
```bash
# Before
PORT=3000
WS_PORT=8080

# After
PORT=8080
# SINGLE_PORT=true is the default
```

2. Update any frontend configuration:
```javascript
// The demo client auto-detects, but for custom clients:
const wsUrl = process.env.NODE_ENV === 'production' 
  ? `wss://${window.location.host}/ws`
  : 'ws://localhost:8080/ws';
```

#### Vite Development Server Configuration

When using Vite for development, configure the proxy to forward API requests:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // Note: WebSocket connections bypass Vite proxy
      // Connect directly to ws://localhost:8080/ws
    }
  }
});
```

**Important:** Vite's proxy only handles HTTP requests. WebSocket connections should connect directly to the backend server:

```javascript
// Development with Vite
const wsUrl = 'ws://localhost:8080/ws';  // Direct connection, not through Vite

// Production
const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
```

### Nginx Configuration

If using nginx as a reverse proxy, update to support WebSocket upgrade on `/ws`:

```nginx
location / {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
}

location /ws {
    proxy_pass http://localhost:8080/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Development vs Production Configuration

#### Development Setup
- Frontend dev server (e.g., Vite) on port 5173
- Shelltender backend on port 8080 (single port mode)
- API requests proxied through dev server
- WebSocket connects directly to backend

```bash
# .env.development
PORT=8080
VITE_WS_URL=ws://localhost:8080/ws
```

#### Production Setup
- Single server serving both frontend and backend
- Everything on one port (e.g., 8080 or 443 for HTTPS)
- No proxy needed - direct connections

```bash
# .env.production
PORT=8080
# Client auto-detects WebSocket URL from window.location
```

### Troubleshooting

#### "WebSocket connection failed"
- Ensure your proxy/load balancer forwards the `/ws` path
- Check that WebSocket upgrade headers are preserved
- Verify firewall allows traffic on the single port

#### Testing Single Port Mode
To verify single port mode is working:
```bash
# Check API endpoint
curl http://localhost:8080/api/health
# Should return: {"status":"ok","port":8080,"mode":"single-port","wsPath":"/ws"}

# Test WebSocket connection
wscat -c ws://localhost:8080/ws
> {"type":"create","rows":24,"cols":80}
# Should receive: {"type":"created","sessionId":"..."}
```

#### "Session not found" errors
- The API hasn't changed - ensure you're calling `create` before `connect`
- Session IDs must exist before connecting (auto-creation was not implemented)

#### Want to revert to dual-port mode?
```bash
SINGLE_PORT=false
PORT=3000
WS_PORT=8080
```

---

## Migrating from v0.3.x to v0.4.x

### Breaking Changes

#### 1. SessionStore Async Initialization (Critical)

**Before (v0.3.x):**
```typescript
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(sessionStore);
```

**After (v0.4.x):**
```typescript
const sessionStore = new SessionStore();
await sessionStore.initialize(); // REQUIRED!
const sessionManager = new SessionManager(sessionStore);
```

**Common Error:** `loadAllSessions is not a function`
**Fix:** Add `await sessionStore.initialize()` before use

#### 2. Terminal Component WebSocket Configuration

**Before:** Terminal created its own WebSocket connection
```jsx
<Terminal sessionId={sessionId} />
```

**After:** Terminal uses shared WebSocket from provider
```jsx
<WebSocketProvider url="ws://localhost:8080">
  <Terminal sessionId={sessionId} />
</WebSocketProvider>
```

### New Features

#### Terminal Ref API (v0.4.0+)
```typescript
const terminalRef = useRef<TerminalHandle>(null);

// Programmatic control
terminalRef.current?.focus();
terminalRef.current?.fit();

<Terminal ref={terminalRef} sessionId={sessionId} />
```

---

## Version Compatibility Matrix

| Component | v0.3.x | v0.4.x | v0.5.x |
|-----------|---------|---------|---------|
| SessionManager | ✓ | ✓ | ✓ |
| BufferManager | ✓ | ✓ | ✓ |
| SessionStore | ✓* | ✓ | ✓ |
| WebSocketServer | ✓ | ✓ | ✓** |
| Terminal (React) | ✓ | ✓** | ✓ |
| Single Port Mode | ✗ | ✗ | ✓ |

\* Requires async initialization in v0.4.0+
\** Enhanced features available

---

## Getting Help

- Check the [README](../README.md) for basic setup
- Review [example implementations](../packages/server/examples/)
- Report issues at [GitHub Issues](https://github.com/your-org/shelltender/issues)