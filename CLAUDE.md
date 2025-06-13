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

## Architecture

### Backend (Node.js/TypeScript)
- **SessionManager** (`src/server/SessionManager.ts`) - Manages PTY processes and session lifecycle
- **BufferManager** (`src/server/BufferManager.ts`) - Maintains scrollback buffers for each session
- **WebSocketServer** (`src/server/WebSocketServer.ts`) - Handles real-time communication with clients
- HTTP server on port 3000, WebSocket server on port 8080

### Frontend (React/TypeScript/Tailwind)
- **Terminal Component** - xterm.js integration with WebSocket communication
- **SessionList Component** - Displays and manages active sessions
- Automatic reconnection on disconnect
- Multi-tab synchronization via shared WebSocket sessions

### Key Features
- Persistent terminal sessions that survive browser closure
- Scrollback buffer maintained server-side (10,000 lines default)
- Real-time synchronization across multiple tabs
- Automatic reconnection with session restore
- Session management UI

## Notes

- Terminal sessions persist as long as the server is running
- Each session spawns a real shell process on the server
- WebSocket handles all real-time communication
- Buffer is preserved even when no clients are connected