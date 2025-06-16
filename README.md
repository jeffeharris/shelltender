# Shelltender - Web-Based Persistent Terminal

A modern web-based terminal that maintains persistent sessions across browser closures with full scrollback history and multi-tab synchronization. Now available as modular npm packages!

## 📦 Packages

Shelltender is now a monorepo with modular packages:

- **[@shelltender/core](packages/core)** - Shared types and interfaces
- **[@shelltender/server](packages/server)** - Backend terminal session management
- **[@shelltender/client](packages/client)** - React components and hooks
- **[shelltender](packages/shelltender)** - All-in-one package

## 🚀 Quick Start

### Using the Combined Package

```bash
npm install shelltender
```

```typescript
import { SessionManager, Terminal } from 'shelltender';
```

### Using Individual Packages

```bash
# Server only
npm install @shelltender/server

# Client only
npm install @shelltender/client

# Types only
npm install @shelltender/core
```

## 🛠️ Development

```bash
# Install all dependencies
npm install

# Run tests across all packages
npm test

# Build all packages
npm run build

# Run the demo application
cd apps/demo
npm run dev
```

## ✨ Features

- **Persistent Sessions**: Terminal sessions continue running on the server when browser tabs are closed
- **Scrollback Buffer**: Maintains up to 10,000 lines of history server-side
- **Session Reconnection**: Reconnect to existing sessions and see the full history
- **Multi-Tab Sync**: Multiple tabs connected to the same session see real-time updates
- **Session Management**: Built-in UI for managing open and backgrounded sessions
- **Restricted Sessions**: Create sandboxed sessions with filesystem restrictions
- **Special Key Support**: Full support for ctrl-c, ctrl-d, ctrl-z, ctrl-r, tab, escape, and arrow keys
- **Automatic Reconnection**: Client automatically reconnects with exponential backoff
- **Session Persistence**: Sessions are saved to disk and restored on server restart
- **Terminal Event System**: Pattern matching and event detection for terminal output
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Modular Architecture**: Use only the parts you need

## 📖 Documentation

- [Architecture](docs/ARCHITECTURE.md) - Detailed monorepo structure and design
- [Terminal Event System](docs/TERMINAL_EVENT_SYSTEM.md) - Pattern matching and event detection
- [Terminal Events API](docs/TERMINAL_EVENTS_API.md) - Event system API reference
- [Demo App](apps/demo) - Example implementation

## 🧪 Testing

```bash
# Test all packages
npm test

# Test specific package
npm test -w @shelltender/core
npm test -w @shelltender/server
npm test -w @shelltender/client

# Test with coverage
npm run test:coverage
```

## 📚 Example Usage

### Server Setup

```typescript
import { SessionManager, WebSocketServer } from '@shelltender/server';

const sessionManager = new SessionManager();
const wsServer = new WebSocketServer(8080, sessionManager);
```

### Client Setup

```typescript
import { Terminal, SessionTabs } from '@shelltender/client';

function App() {
  return (
    <>
      <SessionTabs sessions={sessions} />
      <Terminal sessionId={currentSession} />
    </>
  );
}
```

## 🔒 Security Considerations

This application provides full shell access on the server. In production:
- Implement proper authentication and authorization
- Run terminal sessions in isolated containers or VMs
- Set resource limits per session
- Use HTTPS and WSS for encrypted communication
- Consider using the RestrictedShell for sandboxed sessions

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to our GitHub repository.

## 🏗️ Monorepo Structure

```
shelltender/
├── packages/
│   ├── @shelltender/core/     # Shared types and interfaces
│   ├── @shelltender/server/   # Backend implementation
│   ├── @shelltender/client/   # React components
│   └── shelltender/           # Combined package
├── apps/
│   └── demo/                  # Demo application
└── docs/                      # Documentation
```