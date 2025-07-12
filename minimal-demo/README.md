# Shelltender v0.6.0 Demo

This demo showcases the v0.6.0 convenience APIs and best practices for using Shelltender.

## Quick Start

```bash
docker-compose up
# Visit http://localhost:8085
```

## What This Demo Shows

- **Zero-config server setup** with `createShelltenderServer()`
- **React integration** using `@shelltender/client` components
- **Multi-session support** with tab switching
- **Single-port architecture** (HTTP + WebSocket on same port)
- **Automatic session persistence**

## Setup Instructions

The demo is now self-contained. Just import the styles:

```javascript
import '@shelltender/client/styles.css';  // Import component styles
import '@xterm/xterm/css/xterm.css';      // Import terminal styles
```

No additional setup required!

## Code Example

```javascript
// Server (server.js)
import { createShelltenderServer } from '@shelltender/server';

const { url } = await createShelltenderServer({ 
  port: 8085,
  host: '0.0.0.0'
});

console.log(`Server running at ${url}`);
```

```javascript
// Client (App.jsx)
import { ShelltenderApp, Terminal, SessionTabs, useShelltender } from '@shelltender/client';

function App() {
  return (
    <ShelltenderApp wsUrl="/ws">
      <TerminalWithTabs />
    </ShelltenderApp>
  );
}

function TerminalWithTabs() {
  const { sessions, activeSession, createSession, killSession, switchSession } = useShelltender();
  
  return (
    <>
      <SessionTabs
        sessions={sessions}
        currentSessionId={activeSession}
        onSelectSession={switchSession}
        onNewSession={() => createSession()}
        onCloseSession={killSession}
      />
      {activeSession && <Terminal sessionId={activeSession} />}
    </>
  );
}
```

## Architecture Issues Found

1. **Undocumented Tailwind dependency** - Components break without it
2. **Output tracking in hook** - Causes unnecessary re-renders
3. **No bundled styles** - Users must configure their own styling
4. **Missing session isolation** - Terminal component showed all sessions' output

These issues were discovered and fixed in this demo, highlighting areas where v0.6.0 needs improvement.