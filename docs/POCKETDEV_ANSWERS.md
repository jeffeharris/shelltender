# Answers to PocketDev's Shelltender v0.6.0 Questions

## 1. Session Persistence Location

**Issue**: Sessions saving to `.sessions/` instead of using `dataDir` option.

**Answer**: This is a bug in v0.6.0. The `dataDir` option wasn't being passed to SessionStore. Fixed in v0.6.1:

```javascript
// v0.6.1 fix - dataDir is now properly used
const shelltender = await createShelltender(app, {
  dataDir: '/app/data/shelltender-sessions'  // Will be used correctly
});
```

**Workaround for v0.6.0**: Create the SessionStore manually:
```javascript
import { SessionStore } from '@shelltender/server';

const sessionStore = new SessionStore('/app/data/shelltender-sessions');
await sessionStore.initialize();

const shelltender = await createShelltender(app, {
  sessionStore  // Pass pre-configured store
});
```

## 2. Container Crashes on createSession

**Likely Causes**:
1. **node-pty compilation**: The most common cause. node-pty must be compiled for the container's architecture.
2. **Missing PTY device**: Alpine containers sometimes lack `/dev/ptmx` or proper permissions.
3. **Memory/permission issues**: Creating PTY requires specific kernel capabilities.

**Debug Steps**:
```dockerfile
# In your Dockerfile, ensure node-pty is rebuilt:
RUN npm install && npm rebuild node-pty --update-binary

# Test PTY availability:
RUN node -e "console.log(require('fs').existsSync('/dev/ptmx'))"
```

**Test Script**:
```javascript
// test-pty.js - Run this in your container
const pty = require('node-pty');

console.log('Testing PTY creation...');
try {
  const ptyProcess = pty.spawn('/bin/sh', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env
  });
  
  console.log('✅ PTY created successfully');
  ptyProcess.kill();
} catch (error) {
  console.error('❌ PTY creation failed:', error);
  console.error('Stack:', error.stack);
}
```

## 3. Required vs Optional Parameters

**Minimum Required Parameters**: Actually, none! All parameters have defaults:

```javascript
// Minimal - all defaults
const session = shelltender.createSession();

// Recommended minimum
const session = shelltender.createSession({
  id: 'my-session'  // Optional but recommended
});

// Full options
const session = shelltender.createSession({
  id: 'my-session',
  cols: 80,              // Default: 80
  rows: 24,              // Default: 24
  command: '/bin/bash',  // Default: OS default shell
  args: [],              // Default: []
  cwd: '/home/user',     // Default: process.cwd()
  env: { /* ... */ }     // Default: process.env
});
```

## 4. WebSocket Connection Lifecycle

**Connection Flow**:

1. **Connect to WebSocket**:
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
```

2. **Send connect message** (attach to existing session):
```javascript
ws.send(JSON.stringify({
  type: 'connect',
  sessionId: 'test-123'
}));
```

3. **Or create new session**:
```javascript
ws.send(JSON.stringify({
  type: 'create',
  options: {
    id: 'test-123',
    cols: 80,
    rows: 24
  }
}));
```

4. **Send input**:
```javascript
ws.send(JSON.stringify({
  type: 'input',
  sessionId: 'test-123',
  data: 'ls -la\n'
}));
```

5. **Receive output**:
```javascript
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'output') {
    console.log('Terminal output:', msg.data);
  }
});
```

## 5. Debug Mode

**Enable Debug Logging**:

```bash
# Environment variables
DEBUG=shelltender:* node shelltender-service.js
SHELLTENDER_DEBUG=true node shelltender-service.js

# In code
const shelltender = await createShelltender(app, {
  debug: true,  // Not implemented in v0.6.0 but good practice
  // ... other options
});

# Add debug logging before createSession
console.log('Process info:', {
  uid: process.getuid?.() || 'N/A',
  gid: process.getgid?.() || 'N/A',
  cwd: process.cwd(),
  node: process.version,
  platform: process.platform
});
```

## Debug Container Script

Create this script to diagnose the crash:

```javascript
// debug-crash.js
import { createShelltender } from '@shelltender/server';
import express from 'express';

const app = express();

async function debugSession() {
  console.log('=== SHELLTENDER DEBUG ===');
  console.log('Node:', process.version);
  console.log('Platform:', process.platform);
  console.log('CWD:', process.cwd());
  console.log('UID:', process.getuid?.() || 'N/A');
  
  // Check PTY
  try {
    const pty = require('node-pty');
    console.log('✅ node-pty loaded');
  } catch (e) {
    console.log('❌ node-pty failed:', e.message);
  }
  
  // Check /dev/ptmx
  const fs = require('fs');
  console.log('/dev/ptmx exists:', fs.existsSync('/dev/ptmx'));
  
  try {
    // Create minimal Shelltender
    const shelltender = await createShelltender(app, {
      port: 8080,
      dataDir: '/tmp/test-sessions'
    });
    console.log('✅ Shelltender created');
    
    // Try session creation with error boundary
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
    
    console.log('Creating session...');
    const session = shelltender.createSession({
      id: 'debug-test',
      command: '/bin/sh'  // Use sh instead of bash
    });
    
    console.log('✅ Session created:', session.id);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

debugSession();
```

## Most Likely Fix

Based on Alpine Linux container context, try:

1. **Use `/bin/sh` instead of `/bin/bash`**:
```javascript
command: '/bin/sh'  // Alpine doesn't have bash by default
```

2. **Install bash if needed**:
```dockerfile
RUN apk add --no-cache bash
```

3. **Ensure PTY permissions**:
```dockerfile
# In docker-compose.yml
privileged: true  # Temporarily for testing
```

4. **Or use security options**:
```yaml
security_opt:
  - seccomp:unconfined
```

The silent crash is most likely node-pty failing to create a PTY in the container environment.