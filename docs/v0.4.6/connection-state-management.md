# Connection State Management Analysis and Fix Plan

## Executive Summary

The Shelltender client has a critical timing issue where the Terminal component reports "WebSocket service not available" even when the WebSocket service is connected. This occurs due to a race condition between the WebSocket service initialization and the Terminal component's effect execution.

## Current State Management Analysis

### 1. WebSocket Service Architecture

The client uses a shared WebSocket service pattern:
- Single global `sharedWsService` instance shared across all components
- Reference counting (`connectionCount`) to manage lifecycle
- Service created on first use, destroyed when no components need it

### 2. State Flow Diagram

```
┌─────────────────┐
│  useWebSocket   │
│     Hook        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ sharedWsService │────▶│ WebSocketService│
│  (global var)   │     │   (instance)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  wsServiceRef   │     │   WebSocket     │
│  (component)    │     │   (browser)     │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│    Terminal     │
│   Component     │
└─────────────────┘
```

### 3. Identified Issues

#### Issue 1: Race Condition in useWebSocket Hook

**Root Cause**: The hook returns `wsServiceRef.current` which is initially `null` during the first render.

```typescript
// useWebSocket.ts
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsServiceRef = useRef<WebSocketService | null>(null);
  
  useEffect(() => {
    // Service creation happens here, AFTER first render
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

**Timeline**:
1. Component renders → `wsService` is `null`
2. useEffect runs → creates/assigns service
3. Component doesn't re-render → Terminal still sees `null`

#### Issue 2: Missing Config Dependency

The `useWebSocket` hook doesn't include `config` in its dependency array, which could cause stale configuration if it changes.

#### Issue 3: Inconsistent Connection State

The `isConnected` state in the hook can be out of sync with the actual WebSocket state due to timing of event handlers.

#### Issue 4: Multiple Event Handler Registration

When connection state changes rapidly, event handlers might be registered multiple times without proper cleanup.

## Proposed State Tracking Improvements

### Solution 1: Immediate Service Reference

Return the global service directly instead of using a ref:

```typescript
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [service, setService] = useState<WebSocketService | null>(null);
  const { config } = useWebSocketConfig();
  
  useEffect(() => {
    if (!sharedWsService) {
      sharedWsService = new WebSocketService(config);
      sharedWsService.connect();
    }
    
    setService(sharedWsService); // Trigger re-render
    connectionCount++;
    
    // ... rest of effect
  }, [config]);
  
  return {
    wsService: service, // Now updates properly
    isConnected
  };
}
```

### Solution 2: Synchronous Service Initialization

Initialize the service synchronously to ensure it's always available:

```typescript
function getOrCreateWebSocketService(config: WebSocketServiceConfig): WebSocketService {
  if (!sharedWsService) {
    sharedWsService = new WebSocketService(config);
    sharedWsService.connect();
  }
  return sharedWsService;
}

export function useWebSocket() {
  const { config } = useWebSocketConfig();
  const [isConnected, setIsConnected] = useState(false);
  
  // Get service synchronously
  const wsService = getOrCreateWebSocketService(config);
  
  useEffect(() => {
    connectionCount++;
    
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    wsService.onConnect(handleConnect);
    wsService.onDisconnect(handleDisconnect);
    
    // Check initial state
    setIsConnected(wsService.isConnected());
    
    return () => {
      connectionCount--;
      if (connectionCount === 0 && sharedWsService) {
        sharedWsService.disconnect();
        sharedWsService = null;
      }
    };
  }, [wsService]);
  
  return { wsService, isConnected };
}
```

### Solution 3: Enhanced Event Management

Improve the WebSocketService to handle multiple listeners properly:

```typescript
export class WebSocketService {
  private connectHandlers: Set<() => void> = new Set();
  private disconnectHandlers: Set<() => void> = new Set();
  
  onConnect(handler: () => void): void {
    this.connectHandlers.add(handler);
    // If already connected, call immediately
    if (this.isConnected()) {
      handler();
    }
  }
  
  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.add(handler);
  }
  
  removeConnectHandler(handler: () => void): void {
    this.connectHandlers.delete(handler);
  }
  
  removeDisconnectHandler(handler: () => void): void {
    this.disconnectHandlers.delete(handler);
  }
}
```

## Event Flow Diagrams

### Current (Problematic) Flow

```
Time →
│
├─ T0: Component Mount
│  ├─ useWebSocket() returns { wsService: null, isConnected: false }
│  └─ Terminal useEffect sees wsService = null → ERROR!
│
├─ T1: useWebSocket useEffect runs
│  ├─ Creates WebSocketService
│  ├─ Sets wsServiceRef.current
│  └─ Registers handlers
│
├─ T2: WebSocket connects
│  └─ isConnected → true (but wsService still null in Terminal!)
│
└─ T3: No re-render triggered
   └─ Terminal still has stale wsService = null
```

### Proposed (Fixed) Flow

```
Time →
│
├─ T0: Component Mount
│  ├─ useWebSocket() creates service synchronously
│  └─ Returns { wsService: WebSocketService, isConnected: false }
│
├─ T1: Terminal useEffect runs
│  ├─ wsService is available ✓
│  └─ Registers message handlers
│
├─ T2: useWebSocket useEffect runs
│  └─ Registers connection handlers
│
├─ T3: WebSocket connects
│  ├─ isConnected → true
│  └─ Components re-render with updated state
│
└─ T4: Terminal ready for messages
```

## Implementation Plan

### Phase 1: Fix Race Condition (Priority: HIGH)
1. Update `useWebSocket` hook to use synchronous service initialization
2. Add proper cleanup for event handlers
3. Ensure service reference is always available

### Phase 2: Improve State Consistency (Priority: MEDIUM)
1. Add connection state tracking to WebSocketService
2. Implement proper event handler management with Sets
3. Add "connecting" state to distinguish from disconnected

### Phase 3: Add Resilience (Priority: LOW)
1. Add connection timeout handling
2. Implement exponential backoff with jitter
3. Add connection health monitoring

### Testing Strategy

1. **Unit Tests**:
   - Test hook initialization timing
   - Test multiple component mounting/unmounting
   - Test rapid connection/disconnection cycles

2. **Integration Tests**:
   - Test Terminal component with mocked WebSocket
   - Test session switching during connection changes
   - Test error scenarios

3. **E2E Tests**:
   - Test real WebSocket connection lifecycle
   - Test browser refresh/navigation
   - Test network interruption scenarios

## Migration Guide

The fix will be backwards compatible. No changes required in consuming components.

## Monitoring and Metrics

After deployment, monitor:
1. "WebSocket service not available" error frequency
2. Connection establishment time
3. Reconnection success rate
4. Memory usage (ensure no leaks from event handlers)

## Conclusion

The root cause is a timing issue where the Terminal component receives a null WebSocket service reference on initial render. The proposed solution ensures the service is always available by initializing it synchronously and properly managing component state updates.