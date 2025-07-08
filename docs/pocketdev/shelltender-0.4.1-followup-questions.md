# Shelltender v0.4.1 Follow-up Questions

## Context
We followed the guidance from the previous answers:
- Removed WebSocketProvider wrapper
- Using Terminal component directly
- Confirmed we have v0.4.1 installed

However, we're encountering new issues that prevent the ref from being set.

## Current Issues

### 1. Terminal Ref Callback Never Called

**Issue:** The ref callback is never invoked, even with the simplified implementation:

```typescript
<Terminal
  ref={(el) => {
    console.log('This never gets called!', el);
    terminalRef.current = el;
  }}
  sessionId={sessionId}
  debug={true}
/>
```

**Question:** Is there a known issue with ref forwarding in v0.4.1? The ref callback is completely silent - no logs, no errors.

### 2. WebSocket Connection URL Hardcoded

**Issue:** The Terminal is trying to connect to `ws://localhost:8081/` directly, ignoring our Vite proxy configuration at `/shelltender-ws`.

Console shows:
```
WebSocket connection to 'ws://localhost:8081/' failed: WebSocket is closed before the connection is established.
```

**Question:** How do we configure the Terminal's WebSocket URL? Our setup:
- Vite proxy: `/shelltender-ws` → `http://shelltender:8081`
- Backend expects connections at the proxy path
- No visible prop or configuration option for WebSocket URL

### 3. WebSocket Failure Preventing Initialization?

**Issue:** It appears the Terminal component might not be initializing properly due to WebSocket connection failures.

**Question:** Does the Terminal component fail to mount (and thus not call the ref callback) when the WebSocket connection fails? Is the ref only set after a successful WebSocket connection?

### 4. Configuration Options Missing?

**Issue:** The previous implementation used WebSocketProvider with a config prop:
```typescript
<WebSocketProvider config={{ url: websocketUrl }}>
```

**Question:** Without WebSocketProvider, how do we configure:
- WebSocket URL
- Authentication headers
- Reconnection settings
- Other WebSocket options

### 5. React StrictMode Interference?

**Issue:** We're running in React 19.1.0 with StrictMode in development, which double-mounts components.

**Question:** Could React StrictMode's double-mounting behavior be causing issues with:
- WebSocket singleton initialization
- Ref callback execution
- Terminal component lifecycle

## What We've Tried

1. **Direct Terminal usage** (as recommended):
```typescript
<Terminal
  ref={terminalRef}
  sessionId={sessionId}
  debug={true}
/>
```
Result: Ref never set, WebSocket connection fails

2. **Ref callback logging**:
```typescript
ref={(el) => {
  console.log('Ref callback:', el); // Never logs
  terminalRef.current = el;
}}
```
Result: Callback never executed

3. **Debug mode enabled**:
```typescript
debug={true}
```
Result: No debug logs appear in console

4. **Various timing approaches**:
- useEffect with dependencies
- setTimeout with various delays
- Direct access after render
Result: terminalRef.current always null

## Environment Details

```bash
# Package versions
@shelltender/client: 0.4.1
react: 19.1.0
typescript: 5.8.3
vite: 7.0.0

# Proxy configuration (vite.config.ts)
proxy: {
  '/shelltender-ws': {
    target: 'http://shelltender:8081',
    ws: true,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/shelltender-ws/, '')
  }
}

# Docker services
- Backend on port 3005
- Shelltender on port 8081 (WebSocket) and 8080 (HTTP API)
```

## Core Question

**How do we configure the Terminal component to use our proxied WebSocket URL (`/shelltender-ws`) instead of the hardcoded `ws://localhost:8081/`?**

Without this, the Terminal can't connect, which seems to prevent:
1. Component initialization
2. Ref callback execution
3. Access to focus() and fit() methods

## Minimal Reproduction

```typescript
import { Terminal } from '@shelltender/client';
import { useRef, useEffect } from 'react';

function App() {
  const terminalRef = useRef(null);
  
  useEffect(() => {
    console.log('terminalRef.current:', terminalRef.current); // Always null
  }, []);
  
  return (
    <Terminal
      ref={(el) => {
        console.log('Ref callback - el:', el); // Never called
        terminalRef.current = el;
      }}
      sessionId="test-session"
      debug={true}
    />
  );
}
```

Expected: Ref callback logs the terminal instance
Actual: No logs, ref remains null, WebSocket connection fails

## Request

Could you provide:
1. How to configure the WebSocket URL without WebSocketProvider
2. Whether WebSocket connection failure prevents ref initialization
3. Any initialization requirements or lifecycle considerations we're missing
4. Alternative approaches if the current Terminal component doesn't support custom WebSocket URLs

Thank you for your help with this!