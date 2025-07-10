# Fix: useWebSocket Hook Race Condition

## Summary

Fixed the race condition in the `useWebSocket` hook where the Terminal component would receive a `null` WebSocket service on initial render, causing "WebSocket service not available" errors.

## Changes Made

### 1. Synchronous Service Initialization

**Before:**
```typescript
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const { config } = useWebSocketConfig();

  useEffect(() => {
    // Service created AFTER first render
    if (!sharedWsService) {
      sharedWsService = new WebSocketService(config);
      sharedWsService.connect();
    }
    wsServiceRef.current = sharedWsService;
    // ...
  }, []);

  return {
    wsService: wsServiceRef.current,  // NULL on first render!
    isConnected
  };
}
```

**After:**
```typescript
function getOrCreateWebSocketService(config: WebSocketServiceConfig): WebSocketService {
  if (!sharedWsService) {
    sharedWsService = new WebSocketService(config);
    sharedWsService.connect();
  }
  return sharedWsService;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { config } = useWebSocketConfig();
  
  // Get or create service synchronously to ensure it's always available
  const wsService = getOrCreateWebSocketService(config);

  useEffect(() => {
    // Setup handlers...
  }, [wsService]);

  return {
    wsService,  // Always available from first render!
    isConnected
  };
}
```

### 2. Enhanced WebSocketService Event Management

**Before:**
- Single handler storage: `onConnectHandler` and `onDisconnectHandler`
- Last registered handler would overwrite previous ones
- No cleanup mechanism

**After:**
- Multiple handler support: `connectHandlers: Set<() => void>` and `disconnectHandlers: Set<() => void>`
- All handlers are called when events occur
- Proper cleanup with `removeConnectHandler` and `removeDisconnectHandler`
- Immediate callback if already connected when registering

### 3. Proper Event Handler Cleanup

Added cleanup in the useWebSocket hook's effect return:
```typescript
return () => {
  // Clean up event handlers
  wsService.removeConnectHandler(handleConnect);
  wsService.removeDisconnectHandler(handleDisconnect);
  
  connectionCount--;
  
  // Only disconnect if no other components are using it
  if (connectionCount === 0 && sharedWsService) {
    sharedWsService.disconnect();
    sharedWsService = null;
  }
};
```

## Benefits

1. **No More Race Conditions**: WebSocket service is always available from the first render
2. **Multiple Component Support**: Multiple components can register handlers without conflicts
3. **Proper Cleanup**: No memory leaks from dangling event handlers
4. **Immediate State**: Components mounting after connection see correct state immediately

## Testing

Added comprehensive tests in `useWebSocket.test.tsx` covering:
- Immediate service availability
- Connection state updates
- Multiple component scenarios
- Proper cleanup on unmount
- Event handler management

All tests pass successfully, confirming the fix resolves the connection state management issues.

## Migration

No changes required for components using the `useWebSocket` hook. The fix is transparent and maintains the same API.