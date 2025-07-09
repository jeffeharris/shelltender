# Single Port Mode Design Document

## Overview

This document outlines the design for Shelltender's single port mode, which combines HTTP API and WebSocket communication on the same port. This feature simplifies deployment by eliminating the need to configure and expose multiple ports, making it easier to work with proxies, firewalls, and containerized environments.

## Architecture Overview

The single port mode leverages the HTTP upgrade mechanism to handle both regular HTTP requests and WebSocket connections on the same port. When a client requests a WebSocket connection, the server upgrades the HTTP connection to the WebSocket protocol.

### Key Benefits

1. **Simplified Deployment**: Only one port needs to be exposed and configured
2. **Proxy-Friendly**: Works seamlessly with reverse proxies (nginx, Apache, Caddy)
3. **Firewall Simplification**: Reduces firewall rules and port management
4. **Docker/Kubernetes**: Easier container configuration with single port exposure
5. **SSL/TLS**: Single certificate configuration for both HTTP and WebSocket

## UnifiedServer Class Design

The `UnifiedServer` class consolidates the HTTP Express server and WebSocket server into a single entity that listens on one port.

### Class Structure

```typescript
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import { WebSocketServer as WSServer } from 'ws';
import express, { Express } from 'express';
import { SessionManager, BufferManager, SessionStore, EventManager } from '@shelltender/server';

export interface UnifiedServerOptions {
  port: number;
  host?: string;
  ssl?: {
    key: string;
    cert: string;
  };
  sessionManager: SessionManager;
  bufferManager: BufferManager;
  sessionStore?: SessionStore;
  eventManager?: EventManager;
}

export class UnifiedServer {
  private app: Express;
  private server: HTTPServer | HTTPSServer;
  private wss: WSServer;
  private sessionManager: SessionManager;
  private bufferManager: BufferManager;
  private sessionStore?: SessionStore;
  private eventManager?: EventManager;
  private port: number;
  private host: string;

  constructor(options: UnifiedServerOptions) {
    this.port = options.port;
    this.host = options.host || '0.0.0.0';
    this.sessionManager = options.sessionManager;
    this.bufferManager = options.bufferManager;
    this.sessionStore = options.sessionStore;
    this.eventManager = options.eventManager;

    // Initialize Express app
    this.app = express();
    
    // Create HTTP or HTTPS server
    if (options.ssl) {
      this.server = createHTTPSServer({
        key: options.ssl.key,
        cert: options.ssl.cert
      }, this.app);
    } else {
      this.server = createHTTPServer(this.app);
    }

    // Initialize WebSocket server with noServer option
    this.wss = new WSServer({ 
      noServer: true,
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 1,
          memLevel: 1,
          chunkSize: 1024
        },
        threshold: 1024
      }
    });

    this.setupHTTPRoutes();
    this.setupWebSocketUpgrade();
    this.setupWebSocketHandlers();
  }

  private setupHTTPRoutes(): void {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.static('public'));

    // API Routes
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        mode: 'unified',
        port: this.port,
        sessions: this.sessionManager.getAllSessions().length
      });
    });

    this.app.get('/api/sessions', (req, res) => {
      const sessions = this.sessionManager.getAllSessions();
      res.json(sessions);
    });

    this.app.delete('/api/sessions/:id', (req, res) => {
      const sessionId = req.params.id;
      const success = this.sessionManager.killSession(sessionId);
      
      if (success) {
        res.json({ success: true, message: 'Session killed' });
      } else {
        res.status(404).json({ success: false, message: 'Session not found' });
      }
    });

    // Serve React app for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/index.html'));
    });
  }

  private setupWebSocketUpgrade(): void {
    // Handle WebSocket upgrade requests
    this.server.on('upgrade', (request, socket, head) => {
      // Optionally validate the upgrade request
      if (request.url === '/ws' || request.url?.startsWith('/ws/')) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }

  private setupWebSocketHandlers(): void {
    // Reuse existing WebSocket handling logic
    this.wss.on('connection', (ws, request) => {
      const clientId = Math.random().toString(36).substring(7);
      
      // Handle WebSocket messages (reuse existing WebSocketServer logic)
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(clientId, ws, data);
        } catch (error) {
          ws.send(JSON.stringify({ type: 'error', data: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });
    });
  }

  private handleWebSocketMessage(clientId: string, ws: any, data: any): void {
    // Implement message handling (reuse from WebSocketServer)
    // This would include all the existing message types:
    // create, connect, input, resize, disconnect, etc.
  }

  private handleClientDisconnect(clientId: string): void {
    // Clean up client connections and subscriptions
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`Unified server listening on ${this.host}:${this.port}`);
        console.log(`HTTP API available at http://${this.host}:${this.port}/api`);
        console.log(`WebSocket available at ws://${this.host}:${this.port}/ws`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          console.log('Unified server stopped');
          resolve();
        });
      });
    });
  }
}
```

## Integration with Existing Components

### Backward Compatibility

The UnifiedServer is designed to be a drop-in replacement for the separate HTTP and WebSocket servers while maintaining full backward compatibility:

1. **API Compatibility**: All existing HTTP endpoints remain unchanged
2. **WebSocket Protocol**: The WebSocket message protocol remains identical
3. **Component Integration**: Works with existing SessionManager, BufferManager, etc.

### Migration Path

Existing deployments can migrate to single port mode with minimal changes:

```typescript
// Old approach - separate servers
const app = express();
const httpServer = createServer(app);
const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);
httpServer.listen(3000);

// New approach - unified server
const unifiedServer = new UnifiedServer({
  port: 3000,
  sessionManager,
  bufferManager,
  sessionStore,
  eventManager
});
await unifiedServer.start();
```

### Environment Variable Support

Support both modes through environment variables:

```typescript
const useSinglePort = process.env.SHELLTENDER_SINGLE_PORT === 'true';
const httpPort = parseInt(process.env.PORT || '3000');
const wsPort = parseInt(process.env.WS_PORT || '8080');

if (useSinglePort) {
  // Use unified server on httpPort
  const server = new UnifiedServer({ port: httpPort, ...options });
} else {
  // Use separate servers (existing behavior)
  const wsServer = new WebSocketServer(wsPort, ...options);
  httpServer.listen(httpPort);
}
```

## Example Usage

### Basic Usage

```typescript
import { 
  UnifiedServer, 
  SessionManager, 
  BufferManager, 
  SessionStore, 
  EventManager 
} from '@shelltender/server';

// Initialize components
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const eventManager = new EventManager();
const sessionManager = new SessionManager(sessionStore);

// Create unified server
const server = new UnifiedServer({
  port: 3000,
  sessionManager,
  bufferManager,
  sessionStore,
  eventManager
});

// Start the server
await server.start();
```

### With SSL/TLS

```typescript
import fs from 'fs';

const server = new UnifiedServer({
  port: 443,
  ssl: {
    key: fs.readFileSync('server.key', 'utf8'),
    cert: fs.readFileSync('server.crt', 'utf8')
  },
  sessionManager,
  bufferManager
});

await server.start();
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  shelltender:
    image: shelltender:latest
    ports:
      - "3000:3000"  # Only one port needed!
    environment:
      - SHELLTENDER_SINGLE_PORT=true
      - PORT=3000
    volumes:
      - ./sessions:/app/sessions
```

### Nginx Proxy Configuration

```nginx
server {
    listen 80;
    server_name terminal.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

## Client-Side Updates

The client needs minor updates to support single port mode:

### WebSocketService Update

```typescript
export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;

  constructor(options: WebSocketOptions) {
    if (options.singlePort) {
      // Use relative WebSocket URL for single port mode
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.url = `${protocol}//${window.location.host}/ws`;
    } else {
      // Use separate WebSocket port (existing behavior)
      this.url = `ws://${options.host || 'localhost'}:${options.port || 8080}`;
    }
  }

  connect(): void {
    this.ws = new WebSocket(this.url);
    // ... rest of connection logic
  }
}
```

### Configuration Detection

```typescript
// Automatically detect single port mode from API
async function detectServerMode() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    return data.mode === 'unified';
  } catch (error) {
    return false;
  }
}
```

## Deployment Benefits

### 1. Simplified Container Deployment

**Before (Multiple Ports):**
```dockerfile
EXPOSE 3000 8080
```

**After (Single Port):**
```dockerfile
EXPOSE 3000
```

### 2. Kubernetes Service Definition

**Before:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: shelltender
spec:
  ports:
  - name: http
    port: 3000
    targetPort: 3000
  - name: websocket
    port: 8080
    targetPort: 8080
```

**After:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: shelltender
spec:
  ports:
  - name: unified
    port: 3000
    targetPort: 3000
```

### 3. Cloud Provider Benefits

- **AWS ALB**: Single target group configuration
- **Google Cloud Load Balancer**: Simplified health checks
- **Azure Application Gateway**: Single backend pool
- **Heroku**: Works with single PORT environment variable

### 4. Security Benefits

- Single firewall rule for both HTTP and WebSocket
- Unified authentication/authorization layer
- Single SSL/TLS certificate configuration
- Reduced attack surface

## Performance Considerations

1. **Connection Pooling**: The unified server uses the same connection pool for both HTTP and WebSocket
2. **Memory Usage**: Slight reduction in memory overhead from running one server instead of two
3. **CPU Usage**: Marginal improvement from reduced context switching
4. **Latency**: No measurable impact on latency for either protocol

## Testing Strategy

1. **Unit Tests**: Test UnifiedServer initialization and configuration
2. **Integration Tests**: Verify HTTP and WebSocket work on same port
3. **Load Tests**: Ensure performance parity with separate servers
4. **Compatibility Tests**: Verify existing clients work without modification

## Migration Guide

### Step 1: Update Dependencies
```bash
npm update @shelltender/server
```

### Step 2: Update Server Code
```typescript
// Add environment check
const singlePort = process.env.SHELLTENDER_SINGLE_PORT === 'true';

if (singlePort) {
  const server = new UnifiedServer({ port: 3000, ...config });
  await server.start();
} else {
  // Keep existing dual-server setup
}
```

### Step 3: Update Client Configuration
```typescript
// Detect and use appropriate connection mode
const singlePort = await detectServerMode();
const wsService = new WebSocketService({ singlePort });
```

### Step 4: Update Deployment Configuration
- Update Docker/Kubernetes configs to expose single port
- Update reverse proxy configurations
- Update firewall rules

## Future Enhancements

1. **HTTP/2 Support**: Leverage HTTP/2 multiplexing for better performance
2. **QUIC/HTTP/3**: Future-proof with emerging protocols
3. **GraphQL Subscriptions**: Add support for GraphQL subscriptions over WebSocket
4. **gRPC Support**: Potential gRPC integration for high-performance scenarios
5. **Service Worker**: Progressive Web App support with offline capabilities

## Conclusion

The single port mode for Shelltender provides significant deployment and operational benefits while maintaining full backward compatibility. By consolidating HTTP and WebSocket communication onto a single port, we simplify infrastructure requirements and improve the developer experience without sacrificing functionality or performance.