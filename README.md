# Web-Based Persistent Terminal

A modern web-based terminal that maintains persistent sessions across browser closures with full scrollback history and multi-tab synchronization.

## Features

- **Persistent Sessions**: Terminal sessions continue running on the server when browser tabs are closed
- **Scrollback Buffer**: Maintains up to 10,000 lines of history server-side
- **Session Reconnection**: Reconnect to existing sessions and see the full history
- **Multi-Tab Sync**: Multiple tabs connected to the same session see real-time updates
- **Session Management**: Built-in UI for managing open and backgrounded sessions
- **Restricted Sessions**: Create sandboxed sessions with filesystem restrictions
- **Special Key Support**: Full support for ctrl-c, ctrl-d, ctrl-z, ctrl-r, tab, escape, and arrow keys
- **Automatic Reconnection**: Client automatically reconnects with exponential backoff
- **Session Persistence**: Sessions are saved to disk and restored on server restart
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Paste Support**: Multiple methods for pasting text into the terminal

## Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

## Running the Application

### Development Mode

Run both backend and frontend in development mode:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Backend only (port 3000 for HTTP, 8080 for WebSocket)
npm run dev

# Frontend only (port 5173)
npm run dev:client
```

### Testing

```bash
# Run all tests
npm test && cd client && npm test

# Backend tests only
npm test

# Frontend tests only
cd client && npm test
```

### Production Build

```bash
npm run build
npm start
```

## Usage

1. Open http://localhost:5173 (development) or http://localhost:3000 (production)
2. Click "New Terminal" to create a new session
3. Use the terminal as you would any standard terminal
4. Close the browser tab - your session continues running
5. Reopen the app and click on your session to reconnect
6. Open multiple tabs to the same session for synchronized views

### Paste Support

- **Primary**: Use Ctrl+V (Windows/Linux) or Cmd+V (Mac)
- **Fallback**: If clipboard access is denied, a prompt will appear
- **Alternative**: Right-click in the terminal to paste

## Architecture

- **Backend**: Node.js with TypeScript, Express, node-pty, WebSocket
- **Frontend**: React, TypeScript, Tailwind CSS, xterm.js
- **Communication**: WebSocket for real-time bidirectional communication
- **Session Management**: Each terminal runs as a persistent PTY process

For detailed architecture and monorepo restructuring plans, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Configuration

- HTTP Port: 3000 (or set PORT environment variable)
- WebSocket Port: 8080 (or set WS_PORT environment variable)
- Scrollback Buffer: 10,000 lines (configurable in BufferManager)
- Session Storage: `.sessions` directory (created automatically)

## Security Considerations

This application provides full shell access on the server. In production:
- Implement proper authentication and authorization
- Run terminal sessions in isolated containers or VMs
- Set resource limits per session
- Use HTTPS and WSS for encrypted communication