# Shelltender - Web-Based Persistent Terminal

A modern web-based terminal that maintains persistent sessions across browser closures with full scrollback history and multi-tab synchronization. Now available as modular npm packages!

[![npm version](https://img.shields.io/npm/v/shelltender.svg)](https://www.npmjs.com/package/shelltender)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 Packages

Shelltender is now a monorepo with modular packages (v0.2.4):

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

### Important: Initialization Order

Starting with v0.2.4, you must properly initialize the SessionStore:

```typescript
import { SessionManager, BufferManager, SessionStore, WebSocketServer } from '@shelltender/server';

// Initialize components in the correct order
const bufferManager = new BufferManager();
const sessionStore = new SessionStore();

// CRITICAL: Initialize SessionStore before creating SessionManager
await sessionStore.initialize();

const sessionManager = new SessionManager(sessionStore);
const wsServer = new WebSocketServer(8080, sessionManager, bufferManager);
```

See the [minimal integration example](packages/server/examples/minimal-integration.ts) for a complete working setup.

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
- **📱 Mobile Support**: 
  - Touch-optimized interface with gesture support (swipe to switch sessions, multi-touch copy/paste)
  - Enhanced virtual keyboard with customizable key sets
  - Responsive design for phones and tablets
  - Mobile-specific session navigation
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Modular Architecture**: Use only the parts you need
- **Custom Session IDs**: Create sessions with predictable identifiers (v0.2.4+)
- **🎯 Robust Resize Handling**: 
  - ResizeObserver-based detection for flexbox containers
  - Imperative API for manual terminal fitting
  - Configurable padding without CSS conflicts
  - Debug mode for troubleshooting resize issues

## 🆕 What's New in v0.2.4

- **Fixed**: Critical SessionStore initialization race condition
- **Added**: Custom session ID support (`{ id: 'my-custom-id' }`)
- **Added**: Comprehensive [troubleshooting guide](docs/TROUBLESHOOTING.md)
- **Improved**: WebSocket error handling and logging
- **Fixed**: Working directory persistence in sessions

[See full changelog](CHANGELOG.md)

## 📖 Documentation

- [Architecture](docs/ARCHITECTURE.md) - Detailed monorepo structure and design
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Release Guide](RELEASE_GUIDE.md) - How to create and publish releases
- [Terminal Event System](docs/TERMINAL_EVENT_SYSTEM.md) - Pattern matching and event detection
- [Terminal Events API](docs/TERMINAL_EVENTS_API.md) - Event system API reference
- [Terminal Resize Behavior](docs/terminal-resize.md) - Flexbox-aware resize handling
- [Mobile Support Plan](docs/MOBILE_SUPPORT_PLAN.md) - Complete mobile implementation roadmap
- [Mobile Implementation Guide](docs/MOBILE_IMPLEMENTATION_GUIDE.md) - Detailed implementation instructions
- [Mobile Custom Keys](docs/MOBILE_CUSTOM_KEYS.md) - Virtual keyboard customization
- [Demo App](apps/demo) - Example implementation with mobile support
- [Integration Example](packages/server/examples/minimal-integration.ts) - Minimal working setup

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

## 🐳 Docker Development

Shelltender includes a comprehensive Docker development environment that handles all dependencies and configuration.

### Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   # Edit .env if you need custom ports
   ```

2. **Start the development environment:**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - WebSocket: ws://localhost:8080

### Features

- ✅ Hot-reloading for both frontend and backend
- ✅ Pre-installed AI coding assistants (Claude, OpenAI, Gemini CLIs)
- ✅ All dependencies handled automatically
- ✅ Persistent sessions stored in Docker volumes
- ✅ No need to install Node.js or other dependencies locally

### Custom Port Configuration

If the default ports conflict with other services, create a `.env` file:

```env
# Override default ports
PORT=3001
WS_PORT=8082
VITE_PORT=5174

# Update frontend URLs to match
VITE_WS_URL=ws://localhost:8082
VITE_API_URL=http://localhost:3001
```

### Docker Commands

```bash
# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart after code changes (if needed)
docker-compose -f docker-compose.dev.yml restart

# Stop the environment
docker-compose -f docker-compose.dev.yml down

# Rebuild after dependency changes
docker-compose -f docker-compose.dev.yml up --build
```

### Troubleshooting

- **Port conflicts:** Check `.env.example` for port configuration options
- **Permission errors:** The dev container runs as root to avoid permission issues
- **Can't connect:** Ensure Docker is running and ports aren't blocked by firewall