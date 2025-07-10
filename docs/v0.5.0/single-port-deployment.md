# Single Port Mode Deployment Guide

## Overview

As of v0.5.0, Shelltender defaults to **single port mode**, where both HTTP API and WebSocket connections share the same port (default: 8080). This simplifies deployment and is now the recommended configuration.

## Key Changes

### Server Configuration

The demo app and all examples now default to single port mode:

```typescript
// Single port mode (default)
const port = parseInt(process.env.PORT || '8080');
const useSinglePort = process.env.SINGLE_PORT !== 'false';

if (useSinglePort) {
  const wsServer = WebSocketServer.create(
    { server, path: '/ws' },
    sessionManager,
    bufferManager
  );
} else {
  // Dual port mode (legacy)
  const wsServer = WebSocketServer.create(
    parseInt(process.env.WS_PORT || '8081'),
    sessionManager,
    bufferManager
  );
}
```

### Client Auto-Detection

The client now automatically detects the server mode:

```typescript
// Automatically detects single vs dual port mode
async function getWebSocketConfig() {
  const response = await fetch('/api/health');
  const health = await response.json();
  
  if (health.mode === 'single-port') {
    return { url: '/ws' }; // Relative URL for single port
  } else {
    return { port: health.wsPort }; // Separate port for dual mode
  }
}
```

## Environment Variables

### Single Port Mode (Default)
```env
PORT=8080               # Single port for everything
SINGLE_PORT=true        # Default, can be omitted
```

### Dual Port Mode (Legacy)
```env
PORT=3000              # HTTP port
SINGLE_PORT=false      # Enable dual port mode
WS_PORT=8081          # WebSocket port
```

## Benefits

1. **Simplified Deployment**
   - One port to configure in firewalls
   - One port to expose in Docker
   - One port for reverse proxies

2. **Better Platform Support**
   - Works with Heroku (single $PORT)
   - Works with Cloud Run
   - Simplified Kubernetes services

3. **Easier SSL/TLS**
   - Single certificate configuration
   - Automatic WSS when using HTTPS

## Migration from Dual Port

### Docker Compose
```yaml
# Before (dual port)
ports:
  - "3000:3000"
  - "8080:8080"

# After (single port)
ports:
  - "8080:8080"
```

### Nginx Configuration
```nginx
# Single location block handles everything
location / {
  proxy_pass http://localhost:8080;
  proxy_http_version 1.1;
  
  # WebSocket support
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
}

map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}
```

### Client Configuration

No changes needed! The client automatically detects and adapts to the server mode.

## API Endpoints

In single port mode, everything is on the same port:

- HTTP API: `http://localhost:8080/api/*`
- WebSocket: `ws://localhost:8080/ws`
- Static files: `http://localhost:8080/*`

## Troubleshooting

### "WebSocket connection failed"
- Ensure your reverse proxy supports WebSocket upgrade
- Check that the `/ws` path is not blocked

### "Cannot connect to port 8080"
- Check if another service is using port 8080
- Set a custom port: `PORT=3000 npm start`

### Forcing Dual Port Mode
If you need dual port mode for compatibility:
```bash
SINGLE_PORT=false PORT=3000 WS_PORT=8081 npm start
```

## Production Recommendations

1. **Use Single Port Mode** - It's simpler and more reliable
2. **Enable HTTPS** - WebSocket automatically uses WSS
3. **Set Proper Headers** - Ensure proxies forward upgrade headers
4. **Monitor Both Protocols** - Check `/api/health` for status

## Example Deployments

### Heroku
```bash
# Procfile
web: npm start

# Uses $PORT environment variable automatically
```

### Docker
```dockerfile
EXPOSE 8080
CMD ["npm", "start"]
```

### Kubernetes
```yaml
apiVersion: v1
kind: Service
metadata:
  name: shelltender
spec:
  ports:
  - port: 8080
    targetPort: 8080
    name: http-ws
```

## Conclusion

Single port mode is now the default and recommended deployment method for Shelltender. It simplifies infrastructure, improves compatibility, and maintains all functionality while reducing complexity.