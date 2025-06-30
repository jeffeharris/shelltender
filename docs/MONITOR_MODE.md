# Shelltender Monitor Mode

Monitor Mode allows external services to receive all terminal output across all sessions in real-time. This is perfect for:
- AI session monitoring dashboards
- Security monitoring and compliance
- Terminal activity logging
- Pattern detection across multiple sessions

## Quick Start

1. **Set authentication key** (optional):
   ```bash
   export SHELLTENDER_MONITOR_AUTH_KEY="your-secret-key"
   ```

2. **Connect via WebSocket** and enable monitor mode:
   ```javascript
   const ws = new WebSocket('ws://localhost:8080');
   
   ws.on('open', () => {
     ws.send(JSON.stringify({
       type: 'monitor-all',
       authKey: 'your-secret-key'
     }));
   });
   ```

3. **Receive all terminal output**:
   ```javascript
   ws.on('message', (data) => {
     const msg = JSON.parse(data);
     if (msg.type === 'session-output') {
       console.log(`Session ${msg.sessionId}: ${msg.data}`);
     }
   });
   ```

## Message Format

### Enable Monitor Mode
```json
{
  "type": "monitor-all",
  "authKey": "your-secret-key"
}
```

### Success Response
```json
{
  "type": "monitor-mode-enabled",
  "message": "Successfully enabled monitor mode. You will receive all terminal output.",
  "sessionCount": 5
}
```

### Terminal Output Events
```json
{
  "type": "session-output",
  "sessionId": "abc123",
  "data": "$ ls -la\ntotal 48\n...",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Authentication

Monitor mode requires authentication to prevent unauthorized access to all terminal sessions.

### Setting the Auth Key

1. **Environment variable** (recommended):
   ```bash
   export SHELLTENDER_MONITOR_AUTH_KEY="your-secure-key"
   ```

2. **Default key** (development only):
   If no environment variable is set, the default key is `default-monitor-key`

## Example: AI Session Monitor

Here's a complete example for monitoring AI assistant sessions:

```javascript
const WebSocket = require('ws');

class AISessionMonitor {
  constructor(wsUrl, authKey) {
    this.ws = new WebSocket(wsUrl);
    this.sessions = new Map();
    this.authKey = authKey;
    
    this.setupWebSocket();
  }
  
  setupWebSocket() {
    this.ws.on('open', () => {
      // Enable monitor mode
      this.ws.send(JSON.stringify({
        type: 'monitor-all',
        authKey: this.authKey
      }));
    });
    
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      
      if (msg.type === 'session-output') {
        this.processTerminalOutput(msg.sessionId, msg.data);
      }
    });
  }
  
  processTerminalOutput(sessionId, data) {
    // Detect AI states
    if (data.includes('✻ Thinking')) {
      this.updateSessionState(sessionId, 'thinking');
    } else if (data.includes('Would you like me to')) {
      this.updateSessionState(sessionId, 'waiting-confirmation');
    } else if (data.includes('$')) {
      this.updateSessionState(sessionId, 'bash-prompt');
    }
  }
  
  updateSessionState(sessionId, state) {
    console.log(`Session ${sessionId} is now: ${state}`);
    // Update your dashboard here
  }
}

// Usage
const monitor = new AISessionMonitor(
  'ws://localhost:8080',
  process.env.SHELLTENDER_MONITOR_AUTH_KEY
);
```

## Pattern Matching Example

Monitor mode is perfect for detecting patterns across all sessions:

```javascript
const patterns = {
  aiThinking: /✻\s*Thinking.*\((\d+)s\s*·\s*[↓↑]\s*(\d+)\s*tokens\)/,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
  apiKey: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?([a-zA-Z0-9]{32,})["']?/i,
  error: /error|exception|failed|fatal/i
};

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'session-output') {
    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(msg.data)) {
        console.log(`Pattern "${name}" detected in session ${msg.sessionId}`);
        // Take appropriate action
      }
    }
  }
});
```

## Security Considerations

1. **Always use authentication** in production
2. **Use strong, random auth keys** - not the default
3. **Consider TLS/SSL** for WebSocket connections in production
4. **Limit monitor access** to trusted services only
5. **Monitor mode sees ALL terminal output** - ensure proper access controls

## Troubleshooting

### Not receiving any output
- Verify authentication key matches
- Check WebSocket connection is established
- Ensure sessions are active and producing output
- Verify Shelltender is running with correct ports

### Authentication errors
- Check `SHELLTENDER_MONITOR_AUTH_KEY` environment variable
- Ensure the key is passed correctly in the `monitor-all` message
- Look for error messages in the WebSocket response

### Missing sessions
- Monitor mode only receives output from sessions created after connection
- Existing sessions will start sending output as soon as they produce new data
- Use the `sessionCount` in the enable response to verify active sessions

## Testing

Use the included test script to verify monitor mode is working:

```bash
# Set auth key (optional)
export SHELLTENDER_MONITOR_AUTH_KEY="test-key"

# Run the test monitor
node test-monitor-mode.js
```

Then open some terminals and start typing to see the output in the monitor.