# Unified Server Support for Shelltender v0.5.0

## Problem Statement

Currently, the Shelltender `WebSocketServer` class creates its own WebSocket server on a separate port (default 8080), requiring users to manage two separate ports for HTTP and WebSocket traffic. This creates several challenges:

1. **Port Management**: Applications must expose and manage two separate ports
2. **Proxy Configuration**: Reverse proxies and load balancers need separate rules for WebSocket traffic
3. **Firewall Rules**: Additional firewall configurations for the WebSocket port
4. **Docker Complexity**: Need to expose multiple ports in containerized environments
5. **Development Friction**: Developers expect modern libraries to support unified server configurations

Users want the ability to attach the WebSocket server to an existing HTTP server (similar to how the `ws` package allows with `new WebSocketServer({ server })`), enabling both HTTP and WebSocket traffic on the same port.

## Current Implementation Analysis

### WebSocketServer Constructor

The current implementation in `/packages/server/src/WebSocketServer.ts`:

```typescript
constructor(
  port: number, 
  sessionManager: SessionManager, 
  bufferManager: BufferManager, 
  eventManager?: EventManager,
  sessionStore?: SessionStore
) {
  // ...
  this.wss = new WSServer({ port, host: '0.0.0.0' });
  // ...
}
```

The constructor only accepts a `port` parameter and always creates a standalone WebSocket server.

### Usage Patterns

Current usage across the codebase:

1. **Demo App** (`apps/demo/src/server/index.ts`):
   ```typescript
   const wsServer = new WebSocketServer(wsPort, sessionManager, bufferManager, eventManager);
   ```

2. **Examples** (`packages/server/examples/minimal-integration.ts`):
   ```typescript
   const wsServer = new WebSocketServer(wsPort, sessionManager, bufferManager);
   ```

3. **Tests** (`packages/server/tests/integration/websocket.test.ts`):
   ```typescript
   wsServer = new WebSocketServer(testPort, sessionManager, bufferManager, sessionStore);
   ```

All current usage expects a port number as the first parameter.

## Proposed Solution

### Option 1: Overloaded Constructor (Recommended)

Create constructor overloads to support both standalone and attached modes:

```typescript
export class WebSocketServer {
  private wss: WSServer;
  // ... other properties

  // Overload signatures
  constructor(
    port: number,
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore
  );
  constructor(
    options: WebSocketServerOptions,
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore
  );
  
  // Implementation
  constructor(
    portOrOptions: number | WebSocketServerOptions,
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore
  ) {
    this.sessionManager = sessionManager;
    this.bufferManager = bufferManager;
    this.eventManager = eventManager;
    this.sessionStore = sessionStore;

    // Handle both cases
    if (typeof portOrOptions === 'number') {
      // Legacy: standalone server on port
      this.wss = new WSServer({ port: portOrOptions, host: '0.0.0.0' });
    } else {
      // New: flexible options
      const { server, port, noServer, ...wsOptions } = portOrOptions;
      
      if (server) {
        // Attach to existing HTTP server
        this.wss = new WSServer({ server, ...wsOptions });
      } else if (noServer) {
        // No server mode for manual upgrade handling
        this.wss = new WSServer({ noServer: true, ...wsOptions });
      } else if (port !== undefined) {
        // Standalone server with options
        this.wss = new WSServer({ port, host: wsOptions.host || '0.0.0.0', ...wsOptions });
      } else {
        throw new Error('WebSocketServer requires either port, server, or noServer option');
      }
    }

    // Set up event handlers...
    this.setupWebSocketHandlers();
  }
}

// Type definitions
interface WebSocketServerOptions {
  port?: number;
  server?: Server;  // from 'http' or 'https'
  noServer?: boolean;
  host?: string;
  path?: string;
  clientTracking?: boolean;
  maxPayload?: number;
  perMessageDeflate?: boolean | object;
}
```

### Option 2: Factory Methods

Alternative approach using static factory methods:

```typescript
export class WebSocketServer {
  // Keep existing constructor private
  private constructor(
    wss: WSServer,
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore
  ) {
    this.wss = wss;
    // ... initialize other properties
  }

  // Factory for standalone server
  static createStandalone(
    port: number,
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore
  ): WebSocketServer {
    const wss = new WSServer({ port, host: '0.0.0.0' });
    return new WebSocketServer(wss, sessionManager, bufferManager, eventManager, sessionStore);
  }

  // Factory for attached server
  static createAttached(
    server: Server,
    sessionManager: SessionManager,
    bufferManager: BufferManager,
    eventManager?: EventManager,
    sessionStore?: SessionStore,
    options?: Partial<WebSocketServerOptions>
  ): WebSocketServer {
    const wss = new WSServer({ server, ...options });
    return new WebSocketServer(wss, sessionManager, bufferManager, eventManager, sessionStore);
  }
}
```

## Implementation Steps

### Phase 1: Core WebSocketServer Changes

1. **Update Type Definitions** (`packages/core/src/types.ts`):
   ```typescript
   export interface WebSocketServerOptions {
     port?: number;
     server?: Server;
     noServer?: boolean;
     host?: string;
     path?: string;
     // ... other ws options
   }
   ```

2. **Modify WebSocketServer Constructor**:
   - Implement overloaded constructor as shown in Option 1
   - Ensure all existing functionality remains intact
   - Add validation for mutually exclusive options

3. **Update Error Handling**:
   - Add specific error messages for invalid configurations
   - Handle server attachment failures gracefully

### Phase 2: Integration Updates

1. **Update PipelineIntegration** (if needed):
   - Ensure it can work with both standalone and attached servers
   - No changes expected if WebSocketServer interface remains the same

2. **Add Unified Server Example**:
   ```typescript
   // examples/unified-server.ts
   import express from 'express';
   import { createServer } from 'http';
   import { 
     SessionManager, 
     BufferManager, 
     WebSocketServer 
   } from '@shelltender/server';

   const app = express();
   const server = createServer(app);

   // ... initialize managers

   // Create WebSocket server attached to HTTP server
   const wsServer = new WebSocketServer(
     { server },
     sessionManager,
     bufferManager
   );

   // Both HTTP and WebSocket on same port
   server.listen(3000, () => {
     console.log('Unified server listening on port 3000');
   });
   ```

### Phase 3: Documentation and Migration

1. **Update API Documentation**:
   - Document new constructor options
   - Provide migration examples
   - Update README with unified server example

2. **Create Migration Guide**:
   ```typescript
   // Before (v0.4.5 and earlier)
   const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);

   // After (v0.5.0+) - Option 1: Keep same behavior
   const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);

   // After (v0.5.0+) - Option 2: Attach to existing server
   const wsServer = new WebSocketServer(
     { server: httpServer },
     sessionManager,
     bufferManager
   );
   ```

## Testing Considerations

### Unit Tests

1. **Constructor Tests**:
   ```typescript
   describe('WebSocketServer constructor', () => {
     it('should create standalone server with port number', () => {
       const ws = new WebSocketServer(8080, sessionManager, bufferManager);
       expect(ws).toBeDefined();
     });

     it('should attach to existing HTTP server', () => {
       const httpServer = createServer();
       const ws = new WebSocketServer(
         { server: httpServer },
         sessionManager,
         bufferManager
       );
       expect(ws).toBeDefined();
     });

     it('should throw error without port or server', () => {
       expect(() => new WebSocketServer(
         {},
         sessionManager,
         bufferManager
       )).toThrow();
     });
   });
   ```

2. **Integration Tests**:
   - Test HTTP and WebSocket on same port
   - Verify upgrade handling works correctly
   - Test with Express, Fastify, and raw Node.js servers

3. **Backward Compatibility Tests**:
   - Ensure all existing tests pass without modification
   - Verify demos and examples work unchanged

### Manual Testing Checklist

- [ ] Standalone WebSocket server works as before
- [ ] Attached server handles WebSocket upgrades
- [ ] HTTP and WebSocket share same port successfully
- [ ] Proxy configurations work (nginx, Apache)
- [ ] Docker single-port exposure works
- [ ] Load balancer compatibility
- [ ] WebSocket path routing (if specified)

## Backward Compatibility Notes

### Full Backward Compatibility

The proposed solution maintains 100% backward compatibility:

1. **Existing Code**: All existing code continues to work without changes
2. **Type Safety**: TypeScript overloads ensure type safety for both patterns
3. **Runtime Behavior**: No changes to runtime behavior for existing usage
4. **API Surface**: Only additions, no removals or modifications

### Version Strategy

- **v0.5.0**: Introduce unified server support as opt-in feature
- **v0.5.0**: Consider deprecation warnings for standalone mode (if desired)
- **v1.0.0**: Could make unified mode the default (breaking change)

### Migration Path

Users can migrate at their own pace:

```typescript
// Step 1: Current code continues to work
const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);

// Step 2: When ready, switch to unified mode
const server = createServer(app);
const wsServer = new WebSocketServer(
  { server },
  sessionManager,
  bufferManager
);
server.listen(3000); // Single port!

// Step 3: Advanced - custom path
const wsServer = new WebSocketServer(
  { server, path: '/terminal' },
  sessionManager,
  bufferManager
);
```

## Benefits

1. **Simplified Deployment**: Single port for all traffic
2. **Better Proxy Support**: Standard HTTP upgrade handling
3. **Reduced Complexity**: Fewer firewall rules and configurations
4. **Industry Standard**: Follows patterns from ws, Socket.IO, etc.
5. **Flexible Architecture**: Supports various deployment scenarios

## Potential Challenges

1. **Testing Complexity**: Need to test multiple configuration modes
2. **Documentation**: Must clearly explain both modes
3. **Support Burden**: Two patterns to support and debug
4. **Feature Parity**: Ensure both modes support all features

## Conclusion

The unified server support enhancement provides significant value to Shelltender users while maintaining full backward compatibility. The overloaded constructor approach (Option 1) is recommended as it provides the cleanest API and easiest migration path. This change aligns Shelltender with modern WebSocket library patterns and reduces deployment complexity for users.