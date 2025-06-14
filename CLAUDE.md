# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based persistent terminal system that maintains terminal sessions even when browser tabs are closed. Users can reconnect to running sessions, view scrollback history, and share sessions across multiple browser tabs.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   ```

2. Run development servers:
   ```bash
   npm run dev:all  # Runs both backend and frontend
   ```

## Common Commands

- `npm run dev` - Run backend server only
- `npm run dev:client` - Run frontend only  
- `npm run dev:all` - Run both backend and frontend concurrently
- `npm run build` - Build both backend and frontend
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types
- `npm test` - Run all tests (backend + frontend)

## Testing

The project uses Vitest for testing both backend and frontend code:

- Backend tests: `npm test` (from root directory)
- Frontend tests: `cd client && npm test`
- All tests: `npm test && cd client && npm test`

Test coverage includes:
- Backend services (SessionManager, BufferManager, RestrictedShell)
- WebSocket integration
- Frontend components (SessionManager, SessionTabs)
- Frontend services (WebSocketService)

## Architecture

### Backend (Node.js/TypeScript)
- **SessionManager** (`src/server/SessionManager.ts`) - Manages PTY processes and session lifecycle
  - Supports custom commands and restricted sessions
  - Provides programmatic input methods (sendCommand, sendRawInput, sendKey)
- **BufferManager** (`src/server/BufferManager.ts`) - Maintains scrollback buffers for each session
- **RestrictedShell** (`src/server/RestrictedShell.ts`) - Provides filesystem-restricted shell sessions
- **WebSocketServer** (`src/server/WebSocketServer.ts`) - Handles real-time communication with clients
- **SessionStore** (`src/server/SessionStore.ts`) - Persists session state to disk
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

## Notes

- Terminal sessions persist as long as the server is running
- Each session spawns a real shell process on the server
- WebSocket handles all real-time communication
- Buffer is preserved even when no clients are connected
- Sessions are saved to disk and restored on server restart