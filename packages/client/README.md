# @shelltender/client

React components and hooks for building web-based terminal interfaces with Shelltender. This package provides a complete set of UI components for creating persistent terminal sessions with features like tabs, session management, and automatic reconnection.

## Installation

```bash
npm install @shelltender/client
```

Note: This package has peer dependencies on React 18+ and React DOM 18+.

## Quick Start

```tsx
import { Terminal, SessionTabs } from '@shelltender/client';
import '@shelltender/client/styles/terminal.css';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  return (
    <div className="flex flex-col h-screen">
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
    </div>
  );
}
```

## Components

### Terminal

The core terminal emulator component with xterm.js integration.

```tsx
import { Terminal } from '@shelltender/client';

<Terminal
  sessionId="session-123"  // Optional: connect to existing session
  onSessionCreated={(sessionId) => {
    console.log('New session created:', sessionId);
  }}
/>
```

#### Props
- `sessionId?: string` - ID of existing session to connect to (creates new if empty/undefined)
- `onSessionCreated?: (sessionId: string) => void` - Called when a new session is created

#### Features
- Full xterm.js terminal with WebGL rendering
- Automatic WebSocket connection and reconnection
- Scrollback buffer restoration on reconnect
- Clipboard support (Ctrl/Cmd+V, right-click paste)
- Responsive terminal sizing
- Web links addon for clickable URLs
- Unicode support
- Connection status indicator

### SessionTabs

Tab bar component for managing multiple terminal sessions.

```tsx
import { SessionTabs } from '@shelltender/client';

<SessionTabs
  sessions={sessions}
  currentSessionId={currentSessionId}
  onSelectSession={(sessionId) => setCurrentSessionId(sessionId)}
  onNewSession={() => setCurrentSessionId('')}
  onCloseSession={(sessionId) => handleClose(sessionId)}
  onShowSessionManager={() => setShowManager(true)}
/>
```

#### Props
- `sessions: TerminalSession[]` - Array of session objects
- `currentSessionId: string | null` - Currently active session ID
- `onSelectSession: (sessionId: string) => void` - Tab selection handler
- `onNewSession: () => void` - New session creation handler
- `onCloseSession: (sessionId: string) => void` - Tab close handler
- `onShowSessionManager: () => void` - Show session manager handler

#### Features
- Horizontal scrolling for many tabs
- Active tab highlighting
- Hover states with close buttons
- New session button (+)
- Session manager button (≡)

### SessionManager

Modal dialog for managing all sessions including backgrounded ones.

```tsx
import { SessionManager } from '@shelltender/client';

<SessionManager
  sessions={allSessions}
  openTabs={openTabIds}
  onOpenSession={(sessionId) => openSession(sessionId)}
  onKillSession={(sessionId) => killSession(sessionId)}
  onClose={() => setShowManager(false)}
/>
```

#### Props
- `sessions: TerminalSession[]` - All available sessions
- `openTabs: string[]` - IDs of sessions currently open in tabs
- `onOpenSession: (sessionId: string) => void` - Open backgrounded session
- `onKillSession: (sessionId: string) => void` - Terminate session
- `onClose: () => void` - Close modal

#### Features
- Categorized view (Open/Backgrounded sessions)
- Session metadata display
- Kill confirmation dialog
- Click to open backgrounded sessions
- Keyboard accessible

### SessionList

Sidebar component with auto-refreshing session list.

```tsx
import { SessionList } from '@shelltender/client';

<SessionList
  currentSessionId={currentSessionId}
  onSelectSession={(sessionId) => setCurrentSessionId(sessionId)}
/>
```

#### Props
- `currentSessionId?: string | null` - Currently selected session
- `onSelectSession: (sessionId: string) => void` - Session selection handler

#### Features
- Auto-refresh every 5 seconds
- New terminal button
- Session cards with metadata
- Current session highlighting
- Loading state

## Services

### WebSocketService

Low-level WebSocket connection management with automatic reconnection.

```typescript
import { WebSocketService } from '@shelltender/client';

const ws = new WebSocketService();

// Set up handlers
ws.onMessage((data) => {
  console.log('Received:', data);
});

ws.onConnect(() => {
  console.log('Connected to server');
});

ws.onDisconnect(() => {
  console.log('Disconnected from server');
});

// Connect and send messages
ws.connect();
ws.send({
  type: 'input',
  sessionId: 'session-123',
  data: 'ls -la\n'
});
```

#### Methods
- `connect()` - Establish WebSocket connection
- `send(data: TerminalData)` - Send message (queues if disconnected)
- `disconnect()` - Close connection
- `isConnected()` - Check connection status

#### Features
- Automatic reconnection with exponential backoff
- Message queuing when disconnected
- Type-safe message handling
- Event-based architecture

## Styling

### Required CSS

Import the terminal styles in your application:

```tsx
import '@shelltender/client/styles/terminal.css';
```

### Tailwind CSS

The components use Tailwind CSS classes. Ensure Tailwind is configured in your project:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    // Include @shelltender/client components
    "./node_modules/@shelltender/client/dist/**/*.js",
  ],
  // ... rest of config
}
```

### Custom Styling

Components use standard CSS classes that can be overridden:

```css
/* Override terminal background */
.terminal-container {
  background-color: #1e1e1e;
}

/* Custom tab styling */
.session-tab {
  background-color: #2d2d2d;
  color: #ffffff;
}

/* Active tab */
.session-tab.active {
  border-bottom-color: #007acc;
}
```

## Complete Example

```tsx
import React, { useState, useCallback } from 'react';
import { 
  Terminal, 
  SessionTabs, 
  SessionManager,
  SessionList 
} from '@shelltender/client';
import '@shelltender/client/styles/terminal.css';

function TerminalApp() {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  const handleSessionCreated = useCallback((sessionId: string) => {
    // Fetch session details from server
    fetch(`/api/sessions/${sessionId}`)
      .then(res => res.json())
      .then(session => {
        setSessions(prev => [...prev, session]);
        setOpenTabs(prev => [...prev, sessionId]);
      });
  }, []);

  const handleCloseSession = useCallback((sessionId: string) => {
    setOpenTabs(prev => prev.filter(id => id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(openTabs[0] || null);
    }
  }, [currentSessionId, openTabs]);

  const handleKillSession = useCallback(async (sessionId: string) => {
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    handleCloseSession(sessionId);
  }, [handleCloseSession]);

  return (
    <div className="flex h-screen">
      {/* Optional sidebar */}
      <div className="w-64 border-r">
        <SessionList
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
        />
      </div>

      {/* Main terminal area */}
      <div className="flex-1 flex flex-col">
        <SessionTabs
          sessions={sessions.filter(s => openTabs.includes(s.id))}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewSession={() => setCurrentSessionId('')}
          onCloseSession={handleCloseSession}
          onShowSessionManager={() => setShowManager(true)}
        />
        
        <div className="flex-1">
          <Terminal
            key={currentSessionId} // Force remount on session change
            sessionId={currentSessionId}
            onSessionCreated={handleSessionCreated}
          />
        </div>
      </div>

      {/* Session manager modal */}
      {showManager && (
        <SessionManager
          sessions={sessions}
          openTabs={openTabs}
          onOpenSession={(id) => {
            setOpenTabs(prev => [...prev, id]);
            setCurrentSessionId(id);
            setShowManager(false);
          }}
          onKillSession={handleKillSession}
          onClose={() => setShowManager(false)}
        />
      )}
    </div>
  );
}
```

## TypeScript Support

All components are fully typed with TypeScript. Import types from `@shelltender/core`:

```typescript
import type { TerminalSession, SessionOptions } from '@shelltender/core';
```

## Browser Requirements

- Modern browsers with WebSocket support
- ES2020+ JavaScript features
- CSS Grid and Flexbox support

## Best Practices

### Performance
- Use `key` prop on Terminal when switching sessions for clean remounts
- Limit number of concurrent open sessions
- Consider virtualizing session lists for many sessions

### Accessibility
- SessionManager and SessionTabs are keyboard navigable
- Terminal component supports screen readers (limited by xterm.js)
- Use proper ARIA labels for custom implementations

### Security
- Always use WSS (WebSocket Secure) in production
- Implement proper authentication before session creation
- Sanitize any user input before sending to server
- Consider rate limiting for session creation

## Examples

See the [demo app](../../apps/demo) for a complete working example with all components integrated.

## Related Packages

- [@shelltender/core](../core) - Shared types and interfaces
- [@shelltender/server](../server) - Backend server implementation
- [shelltender](../shelltender) - All-in-one package

## License

MIT