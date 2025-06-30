# AI Monitor Integration for Shelltender

## Architecture Overview

The AI monitoring system runs as a **separate server** from the main Shelltender servers. Here's how it all works:

### Servers Running

1. **Shelltender Backend Server** (Port 3000)
   - Handles HTTP requests
   - Serves the web application
   - Run with: `npm run dev`

2. **Shelltender WebSocket Server** (Port 8080)
   - Manages terminal sessions
   - Handles real-time terminal I/O
   - Started automatically with backend

3. **AI Monitor Server** (Port 3001) - **SEPARATE**
   - Monitors all Shelltender sessions
   - Detects AI tool patterns
   - Provides monitoring API
   - Run with: `npx ts-node src/server/ai-monitor-integration.ts`

4. **Demo Client** (Port 5173)
   - React frontend
   - Run with: `npm run dev:client`

## How to Get It Working

### Step 1: Start Shelltender (Terminal 1)
```bash
cd apps/demo
npm run dev
```
This starts the main Shelltender backend and WebSocket servers.

### Step 2: Start AI Monitor Server (Terminal 2)

**Option A: Default Configuration**
```bash
cd apps/demo
npx ts-node src/server/ai-monitor-integration.ts
```

**Option B: Custom Ports**
```bash
# Custom HTTP port
npx ts-node src/server/ai-monitor-integration.ts -p 4000

# Connect to Shelltender on different port
npx ts-node src/server/ai-monitor-integration.ts --ws-port 9000

# Connect to remote Shelltender
npx ts-node src/server/ai-monitor-integration.ts --ws-host 192.168.1.100 --ws-port 8080

# See all options
npx ts-node src/server/ai-monitor-integration.ts --help
```

**Option C: Environment Variables**
```bash
# Copy example config
cp .env.ai-monitor.example .env.ai-monitor

# Edit .env.ai-monitor with your settings
# Then run with environment config
npx ts-node src/server/ai-monitor-env.ts
```

This starts the separate AI monitoring server (default port 3001).

### Step 3: Start Frontend (Terminal 3)
```bash
cd apps/demo
npm run dev:client
```
Opens the web UI at http://localhost:5173

### Step 4: Create a Terminal Session with AI Tool
1. Open browser to http://localhost:5173
2. Click "New Session" 
3. In the terminal, run: `claude` or `aider`
4. The AI Monitor will automatically detect and start monitoring

### Step 5: Verify It's Working

Check the AI Monitor terminal (Terminal 2) for output like:
```
🤖 Detected AI tool in session abc-123
✓ Registered pattern: claude-thinking
✓ Registered pattern: yes-no-prompt
...
🎯 Pattern Match in session abc-123:
  Pattern: claude-thinking
  Match: "• Analyzing… (3s · ↑ 1.2k tokens)"
```

Check the API endpoints:
```bash
# Get monitoring stats
curl http://localhost:3001/api/stats

# Get sessions needing attention
curl http://localhost:3001/api/attention

# List all sessions
curl http://localhost:3001/api/sessions
```

## How It Works

1. **AI Monitor connects to existing Shelltender instance**
   - Creates its own SessionManager, EventManager, etc.
   - Monitors the same session data
   - Runs independently on different port

2. **Pattern Detection**
   - When terminal output contains "claude", "aider", etc., it registers AI patterns
   - Patterns include thinking animations, prompts, errors
   - Real-time pattern matching on all terminal output

3. **REST API**
   - `/api/stats` - Overall monitoring statistics
   - `/api/attention` - Sessions that need human input
   - `/api/sessions` - All monitored sessions
   - `/api/register/:id` - Manually register patterns

## Testing with Claude

To see all patterns detected:
```bash
# In a Shelltender terminal
claude -m claude-3-5-sonnet-20241022

# Ask Claude to demonstrate patterns
> For testing our monitoring system, please show your thinking animation for 5 seconds
> Then ask me a yes/no question
> Then show an error message
```

## Adding to Your App

To add the AI Monitor Dashboard to your app:

```tsx
import { AIMonitorDashboard } from './components/AIMonitorDashboard';

// Default configuration (localhost:3001)
<AIMonitorDashboard />

// Custom API URL
<AIMonitorDashboard apiUrl="http://localhost:4000" />

// Remote monitoring
<AIMonitorDashboard apiUrl="http://192.168.1.100:3001" />

// Using environment variable
<AIMonitorDashboard apiUrl={process.env.REACT_APP_AI_MONITOR_URL || 'http://localhost:3001'} />
```

The dashboard will show:
- Total sessions vs AI sessions
- Sessions needing attention (yellow alert)
- Real-time pattern match counts
- Current state of each AI session

## Important Notes

- The AI Monitor is a **separate process** - it won't work if you don't start it
- It monitors ALL Shelltender sessions, not just one
- Pattern matches are logged to console AND available via API
- The monitoring persists across page reloads (sessions are on server)

## Configuration Summary

### Ports
- **AI Monitor HTTP API**: Default 3001 (configurable)
- **Shelltender WebSocket**: Default 8081 (where AI Monitor connects to)
- **Shelltender Backend**: Default 3000 (not used by AI Monitor)
- **Demo Frontend**: Default 5173 (Vite dev server)

### Configuration Methods
1. **Command Line**: `--http-port`, `--ws-port`, `--ws-host`
2. **Environment Variables**: Via `.env.ai-monitor` file
3. **Constructor**: Pass config object when using as library

### Common Scenarios

**Local Development (Default)**
- Everything on localhost with default ports
- No configuration needed

**Custom Ports**
```bash
# Shelltender on port 9000
npx ts-node ai-monitor-integration.ts --ws-port 9000

# AI Monitor API on port 4000
npx ts-node ai-monitor-integration.ts -p 4000
```

**Remote Monitoring**
```bash
# Monitor Shelltender on another machine
npx ts-node ai-monitor-integration.ts --ws-host 192.168.1.100 --ws-port 8081
```

**Docker/Container**
```bash
# Use host.docker.internal for Docker Desktop
npx ts-node ai-monitor-integration.ts --ws-host host.docker.internal
```