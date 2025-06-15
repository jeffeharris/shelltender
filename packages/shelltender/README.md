# shelltender

All-in-one package for building web-based persistent terminal applications. This package combines `@shelltender/core`, `@shelltender/server`, and `@shelltender/client` into a single convenient import.

## Installation

```bash
npm install shelltender
```

This single package includes all Shelltender functionality:
- TypeScript types and interfaces
- Server-side session management
- React components for the UI
- WebSocket communication

## Why Use This Package?

The combined `shelltender` package is ideal when:
- You're building a full-stack terminal application
- You want a simpler dependency management
- You need both server and client components
- You're prototyping or building a demo

Use individual packages (`@shelltender/core`, `@shelltender/server`, `@shelltender/client`) when:
- You only need specific functionality (e.g., server-only)
- You want to minimize bundle size
- You're building a custom client implementation
- You need more granular version control

## Quick Start

### Full-Stack Example

```typescript
import {
  // Server components
  SessionManager,
  BufferManager,
  SessionStore,
  WebSocketServer,
  
  // Client components
  Terminal,
  SessionTabs,
  SessionManagerComponent,
  
  // Types
  TerminalSession,
  SessionOptions,
  MessageType
} from 'shelltender';

// Server setup
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(bufferManager, sessionStore);
const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);

// React client
function App() {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  return (
    <>
      <SessionTabs
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewSession={() => setCurrentSessionId('')}
        onCloseSession={handleCloseSession}
        onShowSessionManager={() => setShowManager(true)}
      />
      <Terminal
        sessionId={currentSessionId}
        onSessionCreated={handleSessionCreated}
      />
    </>
  );
}
```

## Exports

### Types and Constants (from @shelltender/core)

```typescript
// Terminal types
export interface TerminalSession { ... }
export interface TerminalEvent { ... }

// Session types  
export interface SessionOptions { ... }

// WebSocket types
export interface TerminalData { ... }

// Constants
export const MessageType = { ... }
export const DEFAULT_COLS = 80;
export const DEFAULT_ROWS = 24;
export const DEFAULT_BUFFER_SIZE = 10000;
```

### Server Components (from @shelltender/server)

```typescript
// Core session management
export class SessionManager { ... }

// Buffer management
export class BufferManager { ... }

// Session persistence
export class SessionStore { ... }

// Security features
export class RestrictedShell { ... }

// WebSocket server
export class WebSocketServer { ... }

// Additional types
export type StoredSession = { ... }
```

### Client Components (from @shelltender/client)

```typescript
// Terminal emulator component
export const Terminal: React.FC<TerminalProps>

// Session management modal (aliased to avoid name conflict)
export const SessionManagerComponent: React.FC<SessionManagerProps>

// Tab interface
export const SessionTabs: React.FC<SessionTabsProps>

// Session list sidebar
export const SessionList: React.FC<SessionListProps>

// WebSocket service
export class WebSocketService { ... }
```

## Usage Examples

### Basic Terminal with Tabs

```typescript
import { Terminal, SessionTabs } from 'shelltender';
import 'shelltender/styles/terminal.css';

function BasicTerminal() {
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);

  return (
    <div className="h-screen flex flex-col">
      <SessionTabs
        sessions={sessions}
        currentSessionId={currentId}
        onSelectSession={setCurrentId}
        onNewSession={() => setCurrentId('')}
      />
      <Terminal sessionId={currentId} />
    </div>
  );
}
```

### Server with Restricted Sessions

```typescript
import { SessionManager, RestrictedShell } from 'shelltender';

const sessionManager = new SessionManager();

// Create a sandboxed session
const demoSession = sessionManager.createSession({
  restrictToPath: '/home/demo',
  blockedCommands: ['rm', 'sudo', 'dd'],
  readOnlyMode: false,
  env: { PS1: 'demo> ' }
});
```

### Custom Terminal Events

```typescript
import { TerminalEvent, MessageType } from 'shelltender';

sessionManager.on('sessionOutput', (sessionId, data) => {
  // Detect patterns in output
  if (data.includes('ERROR')) {
    const event: TerminalEvent = {
      type: 'output-match',
      sessionId,
      timestamp: new Date().toISOString(),
      data: { pattern: 'ERROR', content: data }
    };
    handleTerminalEvent(event);
  }
});
```

### Full Application Structure

```typescript
import express from 'express';
import {
  // Server
  SessionManager,
  BufferManager,
  SessionStore,
  WebSocketServer,
  
  // Types
  SessionOptions,
  TerminalSession
} from 'shelltender';

// Initialize server components
const app = express();
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();
const sessionManager = new SessionManager(bufferManager, sessionStore);
const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);

// REST API
app.get('/api/sessions', (req, res) => {
  res.json(sessionManager.getAllSessions());
});

app.post('/api/sessions', (req, res) => {
  const options: SessionOptions = req.body;
  const session = sessionManager.createSession(options);
  res.json(session);
});

app.delete('/api/sessions/:id', (req, res) => {
  sessionManager.killSession(req.params.id);
  res.sendStatus(204);
});

app.listen(3000);
```

## Migration Guide

### From Individual Packages

If you're currently using individual packages:

```typescript
// Before
import { TerminalSession } from '@shelltender/core';
import { SessionManager } from '@shelltender/server';
import { Terminal } from '@shelltender/client';

// After
import { TerminalSession, SessionManager, Terminal } from 'shelltender';
```

### Handling Name Conflicts

The client `SessionManager` component is exported as `SessionManagerComponent` to avoid conflicts with the server `SessionManager` class:

```typescript
import { 
  SessionManager,           // Server class
  SessionManagerComponent   // React component
} from 'shelltender';
```

## CSS Styles

Don't forget to import the required styles:

```typescript
// In your main app file
import 'shelltender/styles/terminal.css';
```

Or in CSS:
```css
@import 'shelltender/styles/terminal.css';
```

## Complete Example

See the [demo app](../../apps/demo) for a full working example using the combined package.

## API Documentation

For detailed API documentation, refer to the individual package READMEs:
- [Core Types and Interfaces](https://github.com/yourusername/shelltender/tree/main/packages/core)
- [Server Components](https://github.com/yourusername/shelltender/tree/main/packages/server)
- [Client Components](https://github.com/yourusername/shelltender/tree/main/packages/client)

## Requirements

- Node.js 16+
- React 18+ (for client components)
- Modern browser with WebSocket support

## License

MIT