# Shelltender v0.4.2 WebSocket Configuration - Fixed!

## The Issue in v0.4.1

In v0.4.1, there was a critical bug where the Terminal component created its own WebSocketService instance instead of using the shared one from the `useWebSocket` hook. This meant that WebSocketProvider configuration was completely ignored.

## The Fix in v0.4.2

The Terminal component now properly uses the shared WebSocket service from the `useWebSocket` hook, which respects the WebSocketProvider configuration.

### What Changed

1. **Terminal.tsx now imports and uses `useWebSocket`**:
   ```typescript
   import { useWebSocket } from '../../hooks/useWebSocket.js';
   
   // Inside the component:
   const { wsService, isConnected: wsConnected } = useWebSocket();
   ```

2. **No more direct WebSocketService instantiation**:
   ```typescript
   // OLD (v0.4.1):
   const ws = new WebSocketService(); // ❌ Ignored config!
   
   // NEW (v0.4.2):
   const ws = wsService; // ✅ Uses shared service with config
   ```

3. **Terminal no longer manages WebSocket lifecycle**:
   - No more `ws.connect()` calls
   - No more `ws.disconnect()` on unmount
   - The shared service handles its own lifecycle

## Usage with Custom WebSocket Configuration

Now WebSocketProvider configuration works correctly:

```typescript
import { WebSocketProvider, Terminal } from '@shelltender/client';

const App = () => {
  const wsConfig = {
    url: '/shelltender-ws'  // Your custom URL
    // OR specify parts:
    // protocol: 'ws',
    // host: 'localhost', 
    // port: '8081'
  };
  
  return (
    <WebSocketProvider config={wsConfig}>
      <Terminal />
    </WebSocketProvider>
  );
};
```

## Vite Proxy Configuration Example

If you're proxying WebSocket connections:

```typescript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/shelltender-ws': {
        target: 'ws://localhost:8081',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace('/shelltender-ws', '')
      }
    }
  }
}
```

## Breaking Changes from v0.4.1

None! This is a bug fix that makes the existing API work as intended.

## Migration from v0.4.1

No code changes required. Your WebSocketProvider configuration will now be respected.

## Terminal Ref Still Works

The Terminal ref with `focus()` and `fit()` methods continues to work as before:

```typescript
const terminalRef = useRef<TerminalHandle>(null);

// Later:
terminalRef.current?.focus();
terminalRef.current?.fit();
```

## Benefits of the Fix

1. **Configuration actually works** - WebSocketProvider config is now respected
2. **Resource efficiency** - Only one WebSocket connection shared across components
3. **Consistent behavior** - All components use the same WebSocket configuration
4. **Easier debugging** - Single WebSocket instance to monitor
5. **Better reconnection** - Centralized reconnection logic in the shared service

## Debugging

If you see "[Terminal] WebSocket service not available" in the console, make sure:
1. Your app is wrapped with `<WebSocketProvider>`
2. The Terminal component is rendered inside the provider
3. Check that your WebSocket URL is correct and the server is running

## Example: Full Working Implementation

```typescript
import { WebSocketProvider, Terminal, TerminalHandle } from '@shelltender/client';
import { useRef, useEffect } from 'react';

function App() {
  const terminalRef = useRef<TerminalHandle>(null);
  
  // Configure WebSocket for your environment
  const wsConfig = {
    url: process.env.NODE_ENV === 'production' 
      ? 'wss://api.example.com/ws'
      : '/ws'  // Proxied in development
  };
  
  useEffect(() => {
    // Focus terminal when ready
    terminalRef.current?.focus();
  }, []);
  
  return (
    <WebSocketProvider config={wsConfig}>
      <div style={{ height: '100vh' }}>
        <Terminal 
          ref={terminalRef}
          onSessionCreated={(id) => console.log('Session:', id)}
        />
      </div>
    </WebSocketProvider>
  );
}
```

## Summary

v0.4.2 fixes the WebSocket configuration bug. The Terminal component now properly uses the shared WebSocket service, making WebSocketProvider configuration work as intended. No API changes, just a bug fix that makes the existing API work correctly.