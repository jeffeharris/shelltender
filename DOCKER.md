# Docker Development Setup

This guide explains how to run Shelltender in Docker for development.

## Quick Start

```bash
# Start the development environment
./docker-dev.sh start

# View logs
./docker-dev.sh logs

# Stop everything
./docker-dev.sh stop
```

## Access Points

Once running, you can access:

- **Web Interface**: http://localhost:5173
- **API Server**: http://localhost:3001
- **WebSocket**: ws://localhost:8081

## Features

### Hot Reloading
The Docker setup includes volume mounts for source code, enabling hot reloading:
- Backend changes are detected by `tsx watch`
- Frontend changes are detected by Vite
- No need to rebuild the container for code changes

### Persistent Data
- Terminal sessions are preserved in Docker volumes
- Sessions survive container restarts
- Bash history is also preserved

### Development Tools
- Full TypeScript support with watch mode
- ESLint and type checking available
- Source maps for debugging

## Common Tasks

### Create a New Session

1. **Via Web Interface** (easiest):
   - Open http://localhost:5173
   - The terminal will auto-create a session

2. **Via WebSocket API**:
   ```javascript
   const ws = new WebSocket('ws://localhost:8081');
   ws.onopen = () => {
     ws.send(JSON.stringify({
       type: 'create',
       cols: 80,
       rows: 24
     }));
   };
   ```

3. **Via curl** (requires websocat):
   ```bash
   echo '{"type":"create","cols":80,"rows":24}' | websocat ws://localhost:8081
   ```

### Access Container Shell

```bash
./docker-dev.sh shell
```

### View Real-time Logs

```bash
./docker-dev.sh logs
```

### Rebuild After Dependencies Change

```bash
./docker-dev.sh rebuild
```

## Environment Variables

The development setup uses these defaults:
- `NODE_ENV=development`
- `PORT=3000` (internal, mapped to 3001)
- `WS_PORT=8080` (internal, mapped to 8081)
- `VITE_WS_URL=ws://localhost:8081`

You can override these in `docker-compose.yml`.

## Troubleshooting

### Port Conflicts
If you see "port is already allocated" errors:
1. Check what's using the port: `lsof -i :PORT`
2. Either stop the conflicting service or change ports in `docker-compose.yml`

### Build Errors
The dev setup uses `|| true` for builds to allow starting even with TypeScript errors. This is intentional for development flexibility.

### Connection Issues
- Ensure Docker is running: `docker ps`
- Check container logs: `./docker-dev.sh logs`
- Verify ports are exposed: `docker compose ps`

## Architecture

The Docker setup runs:
1. **Backend Server** - Node.js/Express API on port 3000
2. **WebSocket Server** - Real-time terminal communication on port 8080
3. **Vite Dev Server** - React frontend with hot reload on port 5173

All three services run concurrently in a single container for simplicity.