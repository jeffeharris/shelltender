# Shelltender Quick Start Guide

## What is Shelltender?
Shelltender is a web-based persistent terminal system that maintains terminal sessions even when browser tabs are closed. It provides real-time terminal access through WebSocket connections.

## Installation

```bash
npm install @shelltender/server @shelltender/client
# IMPORTANT: Also install peer dependencies
npm install @xterm/xterm
```

## Backend Setup

```javascript
import express from 'express';
import { createServer } from 'http';
import { 
  SessionManager, 
  BufferManager, 
  SessionStore, 
  WebSocketServer,
  EventManager,
  TerminalDataPipeline,
  PipelineIntegration  // CRITICAL: Don't forget this!
} from '@shelltender/server';

const app = express();
const httpServer = createServer(app);

// Initialize components
const sessionStore = new SessionStore();
await sessionStore.initialize();

const bufferManager = new BufferManager();
const eventManager = new EventManager();
const sessionManager = new SessionManager(sessionStore);

// Create WebSocket server (single-port mode)
const wsServer = WebSocketServer.create(
  { server: httpServer, path: '/ws' },
  sessionManager,
  bufferManager,
  eventManager
);

// Initialize pipeline
const pipeline = new TerminalDataPipeline();

// CRITICAL: Set up integration - THIS CONNECTS PTY OUTPUT TO WEBSOCKET!
const integration = new PipelineIntegration(
  pipeline,
  sessionManager,
  bufferManager,
  wsServer,
  sessionStore,
  eventManager
);
integration.setup();  // <-- Without this, terminals won't show output!

// Start server
httpServer.listen(8080, () => {
  console.log('Shelltender running on http://localhost:8080');
});
```

## Frontend Setup

```javascript
import React from 'react';
import { WebSocketProvider, Terminal } from '@shelltender/client';
import '@xterm/xterm/css/xterm.css';  // REQUIRED: Import xterm styles

function App() {
  return (
    <WebSocketProvider config={{ url: '/ws' }}>
      <MyTerminalComponent />
    </WebSocketProvider>
  );
}

function MyTerminalComponent() {
  return (
    <div style={{ height: '400px', backgroundColor: '#000' }}>
      <Terminal
        sessionId="my-session"
        onSessionCreated={(id) => console.log('Session created:', id)}
      />
    </div>
  );
}
```

## Common Issues & Solutions

### Terminal shows black screen with no output
**Cause**: Missing `PipelineIntegration`  
**Solution**: Make sure you create and call `integration.setup()`

### Terminal doesn't render at all
**Cause**: Missing xterm CSS  
**Solution**: Import `@xterm/xterm/css/xterm.css` in your app

### WebSocket connection fails
**Cause**: Wrong WebSocket URL or proxy configuration  
**Solution**: Ensure your WebSocket path matches between frontend and backend

## Minimal Docker Setup

```yaml
services:
  shelltender:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SHELLTENDER_PORT=8080
    volumes:
      - ./data:/data  # For session persistence
```

## Development Proxy (Vite)

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  }
}
```

## The Golden Rule
**Always use `PipelineIntegration`!** It's what connects PTY output to WebSocket clients. Without it, you'll see terminal windows but no output.