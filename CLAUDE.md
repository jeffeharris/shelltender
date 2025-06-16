# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shelltender is a web-based persistent terminal system that maintains terminal sessions even when browser tabs are closed. It's now structured as a monorepo with modular npm packages that can be used independently or combined.

## Monorepo Structure

```
shelltender/
├── packages/
│   ├── @shelltender/core/     # Shared types and interfaces
│   ├── @shelltender/server/   # Backend terminal management
│   ├── @shelltender/client/   # React components and hooks
│   └── shelltender/           # Combined package
├── apps/
│   └── demo/                  # Demo application
└── docs/                      # Documentation
```

## Development Setup

1. Install all dependencies (from root):
   ```bash
   npm install
   ```

2. Run the demo application:
   ```bash
   cd apps/demo
   npm run dev
   ```

## Common Commands

### Root Level Commands
- `npm test` - Run all tests across all packages
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run typecheck` - Type check all packages
- `npm run clean` - Clean all node_modules and build artifacts

### Package-Specific Commands
- `npm test -w @shelltender/core` - Test specific package
- `npm run build -w @shelltender/server` - Build specific package
- `npm run dev -w apps/demo` - Run demo in dev mode

### Legacy Commands (still work from root)
- `npm run dev` - Run backend server only
- `npm run dev:client` - Run frontend only  
- `npm run dev:all` - Run both backend and frontend concurrently

## Testing

The project uses Vitest for testing all packages:

- All tests: `npm test`
- Specific package: `npm test -w @shelltender/core`
- With coverage: `npm run test:coverage`
- Watch mode: `npm run test:watch`

Test coverage includes:
- Core package: Type exports and constants, event system types
- Server package: SessionManager, BufferManager, RestrictedShell, WebSocket integration, EventManager, Pattern matchers
- Client package: React components (Terminal, SessionManager, SessionTabs), WebSocketService
- Combined package: Package structure validation

## Architecture

### Backend (Node.js/TypeScript)
- **SessionManager** (`src/server/SessionManager.ts`) - Manages PTY processes and session lifecycle
  - Supports custom commands and restricted sessions
  - Provides programmatic input methods (sendCommand, sendRawInput, sendKey)
- **BufferManager** (`src/server/BufferManager.ts`) - Maintains scrollback buffers for each session
- **RestrictedShell** (`src/server/RestrictedShell.ts`) - Provides filesystem-restricted shell sessions
- **WebSocketServer** (`src/server/WebSocketServer.ts`) - Handles real-time communication with clients
- **SessionStore** (`src/server/SessionStore.ts`) - Persists session state to disk
- **EventManager** (`src/server/events/EventManager.ts`) - Pattern matching and event detection system
- **Pattern Matchers** (`src/server/patterns/`) - Regex, String, ANSI, and Custom pattern matching
- HTTP server on port 3000, WebSocket server on port 8080

### Frontend (React/TypeScript/Tailwind)
- **Terminal Component** - xterm.js integration with WebSocket communication
- **SessionTabs Component** - Tab interface for switching between sessions
- **SessionManager Component** - Modal for managing all sessions (open and backgrounded)
- **WebSocketService** - Handles WebSocket connection with automatic reconnection
- Automatic reconnection on disconnect with exponential backoff
- Multi-tab synchronization via shared WebSocket sessions

### Key Features
- Persistent terminal sessions that survive browser closure
- Scrollback buffer maintained server-side (10,000 lines default)
- Real-time synchronization across multiple tabs
- Automatic reconnection with session restore
- Session management UI with ability to kill sessions
- Restricted shell sessions for sandboxed environments
- Special key support (ctrl-c, ctrl-d, ctrl-z, ctrl-r, tab, escape, arrow keys)
- Terminal event system for pattern matching and output detection
- Built-in ANSI sequence detection and parsing

## Notes

- Terminal sessions persist as long as the server is running
- Each session spawns a real shell process on the server
- WebSocket handles all real-time communication
- Buffer is preserved even when no clients are connected
- Sessions are saved to disk and restored on server restart