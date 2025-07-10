# AI Monitor Docker Setup

## Quick Start

```bash
# Start everything (Shelltender + AI Monitor)
docker-compose up -d

# View logs
docker-compose logs -f ai-monitor

# Stop everything
docker-compose down
```

## What Gets Started

1. **Shelltender** (main container)
   - Backend API: http://localhost:3001
   - WebSocket: ws://localhost:8081
   - Frontend: http://localhost:5173

2. **AI Monitor** (monitoring container)
   - API: http://localhost:3002
   - Monitors Shelltender via internal Docker network

## How It Works

The AI Monitor container:
- Connects to Shelltender via Docker network (shelltender:8080)
- Exposes its API on port 3002 (mapped from internal 3001)
- Persists data in `ai-monitor-data` volume
- Automatically starts with Shelltender

## Using the AI Monitor

### 1. Check It's Running
```bash
# Check health
curl http://localhost:3002/api/stats

# View monitored sessions
curl http://localhost:3002/api/sessions

# Check sessions needing attention
curl http://localhost:3002/api/attention
```

### 2. Add Dashboard to Frontend

In your React app, add the dashboard with Docker URL:

```tsx
import { AIMonitorDashboard } from './components/AIMonitorDashboard';

// In development with Docker
<AIMonitorDashboard apiUrl="http://localhost:3002" />
```

### 3. Test with Claude

1. Open Shelltender: http://localhost:5173
2. Create a new terminal session
3. Run Claude: `claude`
4. Watch the AI Monitor logs:
   ```bash
   docker-compose logs -f ai-monitor
   ```

You'll see:
```
🤖 Detected AI tool in session abc-123
✓ Registered pattern: claude-thinking
✓ Registered pattern: yes-no-prompt
...
🎯 Pattern Match in session abc-123:
  Pattern: claude-thinking
  Match: "• Analyzing… (3s · ↑ 1.2k tokens)"
```

## Configuration

### Environment Variables

The docker-compose.yml sets these for the AI Monitor:

```yaml
AI_MONITOR_HTTP_PORT=3001      # Internal port
SHELLTENDER_WS_HOST=shelltender # Docker service name
SHELLTENDER_WS_PORT=8080        # Internal WebSocket port
AI_MONITOR_DATA_DIR=/app/ai-monitor-data
```

### Modify Ports

To use different ports, edit docker-compose.yml:

```yaml
ai-monitor:
  ports:
    - "4000:3001"  # Change external port to 4000
```

### Custom Configuration

Create `.env` file in project root:

```bash
# AI Monitor external port
AI_MONITOR_PORT=4000

# Add to docker-compose.yml:
ports:
  - "${AI_MONITOR_PORT:-3002}:3001"
```

## Development Workflow

### 1. Live Code Updates

The Docker setup mounts your source code:
- Changes to TypeScript files are reflected immediately
- No need to rebuild containers for code changes

### 2. View Logs

```bash
# All containers
docker-compose logs -f

# Just AI Monitor
docker-compose logs -f ai-monitor

# Just Shelltender
docker-compose logs -f shelltender
```

### 3. Debug Inside Container

```bash
# Enter AI Monitor container
docker-compose exec ai-monitor sh

# Check connectivity to Shelltender
docker-compose exec ai-monitor wget -O- http://shelltender:3000/api/health
```

### 4. Rebuild After Dependencies Change

```bash
# If you add npm packages
docker-compose build ai-monitor
docker-compose up -d ai-monitor
```

## Troubleshooting

### AI Monitor Not Detecting Sessions

1. Check it's running:
   ```bash
   docker-compose ps
   ```

2. Check logs for errors:
   ```bash
   docker-compose logs ai-monitor
   ```

3. Verify connectivity:
   ```bash
   # From host
   curl http://localhost:3002/api/stats
   
   # Test WebSocket connection
   docker-compose exec ai-monitor sh -c "wget -O- http://shelltender:8080"
   ```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
lsof -i :3002

# Use different ports in docker-compose.yml
ports:
  - "4002:3001"  # Change to available port
```

### Container Network Issues

The containers must be on the same network:

```bash
# Check network
docker network ls | grep shelltender

# Inspect network
docker network inspect shelltender-dev_shelltender-network
```

## Production Considerations

For production, consider:

1. **Separate Deployment**: AI Monitor can run on different server
2. **Resource Limits**: Add to docker-compose.yml:
   ```yaml
   ai-monitor:
     deploy:
       resources:
         limits:
           cpus: '0.5'
           memory: 512M
   ```

3. **Persistent Storage**: Use named volumes for data
4. **Security**: Use environment-specific .env files
5. **Monitoring**: Add Prometheus metrics endpoint

## Integration with CI/CD

```yaml
# GitHub Actions example
- name: Start services
  run: docker-compose up -d

- name: Wait for health
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:3002/api/stats; do sleep 2; done'

- name: Run tests
  run: npm test
```