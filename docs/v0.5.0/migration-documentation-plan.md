# Migration Documentation Plan for Shelltender v0.5.0

## Overview

After analyzing the Shelltender codebase and version history, I found that the core API has remained remarkably stable since v0.2.4. The confusion about "missing" methods like `createServer` and `createPipelineBuilder` appears to stem from misunderstanding the API structure:

- `createServer` is from Node.js's `http` module, not a Shelltender API
- `createPipelineBuilder` was never part of the public API
- The core components have maintained consistent exports since the monorepo restructuring in v0.1.0

## Major API Changes Identified

### 1. **SessionManager Constructor Change (v0.3.0)**
- **Old**: `new SessionManager(bufferManager, sessionStore)`
- **New**: `new SessionManager(sessionStore)` 
- **Impact**: BufferManager dependency removed from constructor

### 2. **SessionStore Async Initialization (v0.2.4)**
- **Old**: SessionStore was synchronously initialized
- **New**: Requires `await sessionStore.initialize()` before use
- **Impact**: Critical breaking change that causes runtime errors if not handled

### 3. **WebSocket Response Type (v0.2.4)**
- **Old**: WebSocket sent `type: 'create'` responses
- **New**: WebSocket sends `type: 'created'` responses
- **Impact**: Client code listening for creation events must update

### 4. **Client-Side WebSocket Configuration (v0.4.2)**
- **Old**: Terminal component created its own WebSocketService
- **New**: Terminal uses shared WebSocket from useWebSocket hook
- **Impact**: WebSocketProvider configuration now properly respected

### 5. **Terminal Component Ref API (v0.4.0)**
- **Old**: No ref support
- **New**: ForwardRef with imperative API (focus(), fit())
- **Impact**: Enhanced functionality, backward compatible

## Migration Scenarios

### Scenario 1: Basic Server Setup
Users upgrading from pre-v0.3.0 need to:
1. Remove BufferManager from SessionManager constructor
2. Add async initialization for SessionStore
3. Update WebSocket message handling

### Scenario 2: Client Integration
Users upgrading client code need to:
1. Update WebSocket message type listeners
2. Use WebSocketProvider for configuration
3. Leverage new Terminal ref methods

### Scenario 3: Pipeline Integration
Users implementing data pipelines need to:
1. Use PipelineIntegration class for proper component wiring
2. Follow the pattern shown in minimal-integration.ts

### Scenario 4: Docker/Production Deployment
Users deploying with Docker need to:
1. Update environment variables for new ports
2. Handle async initialization in startup scripts

## Removed/Deprecated Methods

### Never Existed (Common Misconceptions)
- `createServer()` - This is Node.js's http.createServer, not Shelltender
- `createPipelineBuilder()` - Use `new TerminalDataPipeline()` directly
- Factory functions - Shelltender uses direct class instantiation

### Actually Removed
- `BufferManager` parameter from `SessionManager` constructor (v0.3.0)
- Synchronous `SessionStore` initialization (v0.2.4)

## Template for MIGRATION.md

```markdown
# Migration Guide

## Migrating from v0.2.x to v0.4.x

### Breaking Changes

#### 1. SessionStore Async Initialization (Critical)

**Before (v0.2.x):**
```typescript
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(bufferManager, sessionStore);
```

**After (v0.4.x):**
```typescript
const sessionStore = new SessionStore();
await sessionStore.initialize(); // REQUIRED!
const sessionManager = new SessionManager(sessionStore); // No bufferManager
```

#### 2. WebSocket Message Types

**Before:**
```typescript
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'create') { // Old
    // Handle creation
  }
});
```

**After:**
```typescript
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'created') { // New
    // Handle creation
  }
});
```

### Client-Side Changes

#### WebSocket Configuration (v0.4.2+)

**Before:**
```typescript
// Terminal created its own WebSocket connection
<Terminal sessionId={sessionId} />
```

**After:**
```typescript
// Use WebSocketProvider for shared configuration
<WebSocketProvider url="ws://localhost:3001">
  <Terminal sessionId={sessionId} />
</WebSocketProvider>
```

### New Features to Adopt

#### Terminal Ref API (v0.4.0+)
```typescript
const terminalRef = useRef<TerminalHandle>(null);

// Programmatic control
terminalRef.current?.focus();
terminalRef.current?.fit();

<Terminal ref={terminalRef} sessionId={sessionId} />
```

### Common Migration Patterns

#### Pattern 1: Minimal Server Setup
```typescript
// Complete working example
import { SessionManager, BufferManager, SessionStore, WebSocketServer } from '@shelltender/server';

async function startServer() {
  const bufferManager = new BufferManager();
  const sessionStore = new SessionStore();
  
  // Critical: Initialize before use
  await sessionStore.initialize();
  
  const sessionManager = new SessionManager(sessionStore);
  const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);
  
  console.log('Server ready on port 8080');
}

startServer().catch(console.error);
```

#### Pattern 2: Pipeline Integration
```typescript
import { TerminalDataPipeline, PipelineIntegration } from '@shelltender/server';

// Create pipeline
const pipeline = new TerminalDataPipeline();

// Wire components together
const integration = new PipelineIntegration(
  pipeline,
  sessionManager,
  bufferManager,
  wsServer,
  sessionStore
);
integration.setup();
```

### Troubleshooting

#### Error: "loadAllSessions is not a function"
- **Cause**: SessionStore not initialized
- **Fix**: Add `await sessionStore.initialize()` before use

#### Error: Terminal always connects to port 8080
- **Cause**: Terminal not using shared WebSocket (pre-v0.4.2)
- **Fix**: Wrap Terminal in WebSocketProvider

#### Error: Terminal ref.focus() is undefined
- **Cause**: Using older version or bundler stripping forwardRef
- **Fix**: Update to v0.4.5+ which includes bundler workarounds

### Version Compatibility Matrix

| Component | v0.2.x | v0.3.x | v0.4.x |
|-----------|---------|---------|---------|
| SessionManager | ✓ | ✓* | ✓ |
| BufferManager | ✓ | ✓ | ✓ |
| SessionStore | ✓* | ✓* | ✓ |
| WebSocketServer | ✓ | ✓ | ✓ |
| Terminal (React) | ✓ | ✓ | ✓** |

\* Breaking changes - see migration steps
\** Enhanced features available
```

## Implementation Timeline

1. **Phase 1**: Create MIGRATION.md based on template above
2. **Phase 2**: Add migration examples to packages/server/examples/
3. **Phase 3**: Update package READMEs with migration notes
4. **Phase 4**: Create automated migration script (if feasible)

## Additional Documentation Needs

1. **Version Compatibility Guide** - Which versions work together
2. **Upgrade Path Flowchart** - Visual guide for upgrade decisions
3. **Breaking Change Detector** - Script to scan code for deprecated patterns
4. **Migration Examples** - Complete before/after code samples

## Notes

- The API has been stable since v0.3.0 (only bug fixes and enhancements)
- Most "missing" APIs were never part of Shelltender (confusion with Node.js APIs)
- The monorepo structure has been consistent since v0.1.0
- Focus migration docs on the critical SessionStore initialization issue