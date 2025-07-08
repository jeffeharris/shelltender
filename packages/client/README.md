# @shelltender/client

React components and hooks for building web-based terminal interfaces with Shelltender. This package provides a complete set of UI components for creating persistent terminal sessions with features like tabs, session management, automatic reconnection, and comprehensive mobile support.

## Installation

```bash
npm install @shelltender/client
```

### Vite Configuration

If using Vite and experiencing issues with Terminal ref not working, add this to your `vite.config.ts`:

```typescript
export default defineConfig({
  optimizeDeps: {
    exclude: ['@shelltender/client']
  }
})
```

This prevents Vite from pre-bundling the library which can sometimes strip React's forwardRef wrapper.

Note: This package has peer dependencies on React 18+ and React DOM 18+.

## Quick Start

```tsx
import { Terminal, SessionTabs, WebSocketProvider } from '@shelltender/client';
import '@shelltender/client/styles/terminal.css';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Configure WebSocket connection
  const wsConfig = {
    url: '/ws',  // Or specify full URL: 'ws://localhost:8081'
    // Alternative configuration:
    // protocol: 'ws',
    // host: 'localhost',
    // port: '8081'
  };

  return (
    <WebSocketProvider config={wsConfig}>
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
    </WebSocketProvider>
  );
}
```

## WebSocket Configuration

All Shelltender components must be wrapped in a `WebSocketProvider` to configure the WebSocket connection:

```tsx
import { WebSocketProvider } from '@shelltender/client';

// Option 1: Full URL
<WebSocketProvider config={{ url: 'ws://localhost:8081' }}>
  {/* Your app */}
</WebSocketProvider>

// Option 2: Individual parts
<WebSocketProvider config={{ 
  protocol: 'wss',
  host: 'api.example.com',
  port: '443'
}}>
  {/* Your app */}
</WebSocketProvider>

// Option 3: Path only (for proxying)
<WebSocketProvider config={{ url: '/shelltender-ws' }}>
  {/* Your app */}
</WebSocketProvider>
```

If no config is provided, defaults to `ws://[window.location.hostname]:8081`.

## Components

### Terminal

The core terminal emulator component with xterm.js integration.

```tsx
import { Terminal, TerminalTheme } from '@shelltender/client';

// Custom theme
const theme: TerminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#ffffff',
  selection: '#3a3d41'
};

<Terminal
  sessionId="session-123"  // Optional: connect to existing session
  onSessionCreated={(sessionId) => {
    console.log('New session created:', sessionId);
  }}
  // Customization options
  padding={{ left: 12, right: 4 }}
  fontSize={16}
  fontFamily="JetBrains Mono, monospace"
  theme={theme}
  cursorStyle="underline"
  cursorBlink={false}
  scrollback={50000}
/>
```

#### Using the Ref API

The Terminal component exposes imperative methods via ref:

```tsx
import { useRef } from 'react';
import { Terminal, TerminalHandle } from '@shelltender/client';

function MyComponent() {
  const terminalRef = useRef<TerminalHandle>(null);

  const handleFocus = () => {
    terminalRef.current?.focus(); // Focus the terminal
  };

  const handleResize = () => {
    terminalRef.current?.fit(); // Manually fit terminal to container
  };

  return (
    <Terminal
      ref={terminalRef}
      sessionId="session-123"
    />
  );
}
```

#### Props
- `sessionId?: string` - ID of existing session to connect to (creates new if empty/undefined)
- `onSessionCreated?: (sessionId: string) => void` - Called when a new session is created
- `onSessionChange?: (direction: 'next' | 'prev') => void` - Handle session navigation (mobile)
- `onShowVirtualKeyboard?: () => void` - Show virtual keyboard (mobile)
- `padding?: number | { left?: number; right?: number; top?: number; bottom?: number }` - Terminal padding (default: 8px left)
- `fontSize?: number` - Font size in pixels (default: 14)
- `fontFamily?: string` - Font family (default: 'Consolas, Monaco, monospace')
- `theme?: TerminalTheme` - Color theme customization
- `cursorStyle?: 'block' | 'underline' | 'bar'` - Cursor style (default: 'block')
- `cursorBlink?: boolean` - Enable cursor blinking (default: true)
- `scrollback?: number` - Scrollback buffer size (default: 10000)

#### Terminal Theme Interface

```typescript
interface TerminalTheme {
  background?: string;
  foreground?: string;
  cursor?: string;
  cursorAccent?: string;
  selection?: string;
  // ANSI colors
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  // Bright ANSI colors
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}
```

#### Features
- Full xterm.js terminal with WebGL rendering
- Automatic WebSocket connection and reconnection
- Scrollback buffer restoration on reconnect
- Clipboard support (Ctrl/Cmd+V, right-click paste)
- Responsive terminal sizing with ResizeObserver
- Web links addon for clickable URLs
- Unicode support
- Connection status indicator
- Ref-based API for manual control (focus and fit methods)

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

### Mobile Components

#### MobileApp

Wrapper component that provides mobile-optimized layout and context.

```tsx
import { MobileApp } from '@shelltender/client';

<MobileApp desktopComponent={<DesktopLayout />}>
  <MobileTerminalLayout />
</MobileApp>
```

#### MobileTerminal

Touch-optimized terminal with gesture support.

```tsx
import { MobileTerminal } from '@shelltender/client';

<MobileTerminal
  sessionId={currentSessionId}
  onSessionChange={(direction) => {
    // Handle swipe navigation
  }}
/>
```

##### Features
- Swipe left/right to switch sessions
- 2-finger tap to copy
- 3-finger tap to paste
- Long press for context menu
- Touch-friendly interaction

#### MobileSessionTabs

Mobile-optimized session tabs.

```tsx
import { MobileSessionTabs } from '@shelltender/client';

<MobileSessionTabs
  sessions={sessions}
  currentSessionId={currentSessionId}
  onSelectSession={setCurrentSessionId}
  onNewSession={() => setCurrentSessionId('')}
  onManageSessions={() => setShowManager(true)}
/>
```

#### EnhancedVirtualKeyboard

Customizable virtual keyboard with predefined and custom key sets.

```tsx
import { EnhancedVirtualKeyboard } from '@shelltender/client';

<EnhancedVirtualKeyboard
  isVisible={keyboardVisible}
  onInput={(text) => handleInput(text)}
  onCommand={(cmd) => handleCommand(cmd)}
  onMacro={(keys) => handleMacro(keys)}
  onHeightChange={setKeyboardHeight}
/>
```

##### Features
- Multiple key sets (QWERTY, Numbers, Quick, Navigation, Control, Unix, Git, Function)
- Custom key set creation and persistence
- Haptic feedback support
- Responsive layout
- Settings panel

#### KeySetEditor

UI for creating and editing custom key sets.

```tsx
import { KeySetEditor } from '@shelltender/client';

<KeySetEditor
  keySet={customKeySet}
  onSave={(keySet) => saveKeySet(keySet)}
  onCancel={() => setShowEditor(false)}
/>
```

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

### Hooks

#### useMobileDetection

Detects mobile device characteristics.

```tsx
import { useMobileDetection } from '@shelltender/client';

function Component() {
  const { isMobile, isTablet, isIOS, isAndroid, orientation } = useMobileDetection();
  
  if (isMobile) {
    return <MobileLayout />;
  }
  return <DesktopLayout />;
}
```

#### useTouchGestures

Provides touch gesture handling for mobile interactions.

```tsx
import { useTouchGestures } from '@shelltender/client';

function Component() {
  const ref = useRef<HTMLDivElement>(null);
  
  useTouchGestures(ref, {
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right'),
    onLongPress: (x, y) => showContextMenu(x, y),
    onMultiTouch: (fingerCount) => {
      if (fingerCount === 2) handleCopy();
      if (fingerCount === 3) handlePaste();
    }
  });
  
  return <div ref={ref}>Touch me!</div>;
}
```

#### useCustomKeySets

Manages custom keyboard key sets with localStorage persistence.

```tsx
import { useCustomKeySets } from '@shelltender/client';

function KeyboardSettings() {
  const {
    preferences,
    customKeySets,
    createKeySet,
    updateKeySet,
    deleteKeySet
  } = useCustomKeySets();
  
  // Create a new custom key set
  const newKeySet = {
    name: 'My Commands',
    keys: [
      { label: 'Build', type: 'command', value: 'npm run build' },
      { label: 'Test', type: 'command', value: 'npm test' }
    ]
  };
  
  createKeySet(newKeySet);
}
```

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

## Mobile Integration Example

```tsx
import React, { useState } from 'react';
import { 
  MobileApp,
  MobileTerminal,
  MobileSessionTabs,
  EnhancedVirtualKeyboard,
  useMobileDetection 
} from '@shelltender/client';

function App() {
  const { isMobile } = useMobileDetection();
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  if (!isMobile) {
    return <DesktopApp />;
  }
  
  return (
    <MobileApp>
      <div className="flex flex-col h-full">
        <MobileSessionTabs
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewSession={() => setCurrentSessionId('')}
        />
        
        <div className="flex-1" style={{ paddingBottom: keyboardHeight }}>
          <MobileTerminal
            sessionId={currentSessionId}
            onSessionChange={(direction) => {
              // Handle session navigation
              const currentIndex = sessions.findIndex(s => s.id === currentSessionId);
              if (direction === 'next' && currentIndex < sessions.length - 1) {
                setCurrentSessionId(sessions[currentIndex + 1].id);
              } else if (direction === 'prev' && currentIndex > 0) {
                setCurrentSessionId(sessions[currentIndex - 1].id);
              }
            }}
          />
        </div>
        
        <EnhancedVirtualKeyboard
          isVisible={!!currentSessionId}
          onInput={(text) => {
            // Send via WebSocket
          }}
          onCommand={(cmd) => {
            // Send command with newline
          }}
          onHeightChange={setKeyboardHeight}
        />
      </div>
    </MobileApp>
  );
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
- On mobile, minimize DOM updates during keyboard animations

### Mobile Optimization
- Always test on real devices, not just browser DevTools
- Use touch-friendly tap targets (minimum 44px)
- Implement haptic feedback for better UX
- Consider battery usage with WebSocket connections
- Handle both portrait and landscape orientations

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