# Admin Shell Access MVP - Simplified Implementation Plan

## Overview

This is a streamlined implementation plan for single-developer use without authentication or audit logging. Focus is on core functionality only.

## Phase 1: Backend Core (Day 1)

### Task 1.1: Create AdminSessionProxy
**File**: `packages/server/src/admin/AdminSessionProxy.ts`

```typescript
import { EventEmitter } from 'events';
import { SessionManager } from '../SessionManager';

interface AdminSessionHandle {
  sessionId: string;
  mode: 'read-only' | 'interactive';
  attachedAt: Date;
}

export class AdminSessionProxy extends EventEmitter {
  private attachedSessions: Map<string, AdminSessionHandle> = new Map();
  
  constructor(private sessionManager: SessionManager) {
    super();
  }

  async attachToSession(sessionId: string, mode: 'read-only' | 'interactive' = 'read-only'): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.attachedSessions.set(sessionId, {
      sessionId,
      mode,
      attachedAt: new Date()
    });

    this.emit('attached', { sessionId, mode });
  }

  async detachFromSession(sessionId: string): Promise<void> {
    this.attachedSessions.delete(sessionId);
    this.emit('detached', { sessionId });
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    const handle = this.attachedSessions.get(sessionId);
    if (!handle || handle.mode !== 'interactive') {
      throw new Error('Session not in interactive mode');
    }

    this.sessionManager.write(sessionId, data);
  }

  getAttachedSessions(): AdminSessionHandle[] {
    return Array.from(this.attachedSessions.values());
  }
}
```

### Task 1.2: Extend SessionManager
**File**: `packages/server/src/SessionManager.ts`

Add these methods to existing SessionManager:

```typescript
// Simple metadata without user tracking
interface SessionMetadata {
  id: string;
  command: string;
  args: string[];
  createdAt: Date;
  isActive: boolean;
}

getSessionMetadata(sessionId: string): SessionMetadata | null {
  const session = this.sessions.get(sessionId);
  if (!session) return null;
  
  return {
    id: sessionId,
    command: session.command,
    args: session.args,
    createdAt: session.createdAt,
    isActive: true
  };
}

getAllSessionMetadata(): SessionMetadata[] {
  return Array.from(this.sessions.keys())
    .map(id => this.getSessionMetadata(id))
    .filter(Boolean) as SessionMetadata[];
}
```

## Phase 2: WebSocket Integration (Day 2)

### Task 2.1: Add Admin Message Types
**File**: `packages/core/src/types.ts`

```typescript
// Simple admin messages without auth
export interface AdminWebSocketMessage {
  type: 'admin-attach' | 'admin-detach' | 'admin-input' | 'admin-list-sessions';
  sessionId?: string;
  mode?: 'read-only' | 'interactive';
  data?: string;
}
```

### Task 2.2: Handle Admin Messages
**File**: `packages/server/src/WebSocketServer.ts`

```typescript
// Add to constructor
private adminProxy: AdminSessionProxy;
private adminClients: Map<string, Set<WebSocket>> = new Map();

// In handleMessage
if (data.type.startsWith('admin-')) {
  return this.handleAdminMessage(clientId, ws, data as AdminWebSocketMessage);
}

private async handleAdminMessage(
  clientId: string, 
  ws: WebSocket, 
  message: AdminWebSocketMessage
): Promise<void> {
  try {
    switch (message.type) {
      case 'admin-list-sessions':
        const sessions = this.sessionManager.getAllSessionMetadata();
        ws.send(JSON.stringify({ 
          type: 'admin-sessions-list', 
          sessions 
        }));
        break;
        
      case 'admin-attach':
        if (!message.sessionId) return;
        
        await this.adminProxy.attachToSession(message.sessionId, message.mode);
        
        // Track this admin client
        if (!this.adminClients.has(message.sessionId)) {
          this.adminClients.set(message.sessionId, new Set());
        }
        this.adminClients.get(message.sessionId)!.add(ws);
        
        // Send current buffer
        const buffer = this.bufferManager.getBuffer(message.sessionId);
        ws.send(JSON.stringify({
          type: 'buffer',
          sessionId: message.sessionId,
          data: buffer
        }));
        break;
        
      case 'admin-detach':
        if (!message.sessionId) return;
        
        await this.adminProxy.detachFromSession(message.sessionId);
        this.adminClients.get(message.sessionId)?.delete(ws);
        break;
        
      case 'admin-input':
        if (!message.sessionId || !message.data) return;
        
        await this.adminProxy.writeToSession(message.sessionId, message.data);
        break;
    }
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// Modify broadcastToClients to include admin clients
private broadcastToClients(sessionId: string, message: any): void {
  const regularClients = this.clients.get(sessionId) || [];
  const adminViewers = this.adminClients.get(sessionId) || new Set();
  
  const data = JSON.stringify(message);
  
  // Send to regular clients
  regularClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  
  // Send to admin viewers
  adminViewers.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
```

## Phase 3: Simple UI (Days 3-4)

### Task 3.1: Create Admin Route
**File**: `apps/demo/src/App.tsx`

```typescript
import { AdminPanel } from './components/AdminPanel';

// Add to routes
<Route path="/admin" element={<AdminPanel />} />
```

### Task 3.2: Create AdminPanel Component
**File**: `apps/demo/src/components/AdminPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { WebSocketService } from '@shelltender/client';

interface SessionMetadata {
  id: string;
  command: string;
  args: string[];
  createdAt: string;
  isActive: boolean;
}

export const AdminPanel: React.FC = () => {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'read-only' | 'interactive'>('read-only');
  const [ws, setWs] = useState<WebSocketService | null>(null);

  useEffect(() => {
    const wsService = new WebSocketService('ws://localhost:8080');
    
    wsService.on('admin-sessions-list', (data) => {
      setSessions(data.sessions);
    });

    wsService.on('connect', () => {
      wsService.send({ type: 'admin-list-sessions' });
    });

    wsService.connect();
    setWs(wsService);

    return () => wsService.disconnect();
  }, []);

  const handleSessionSelect = (sessionId: string) => {
    if (selectedSessionId) {
      ws?.send({ type: 'admin-detach', sessionId: selectedSessionId });
    }
    
    setSelectedSessionId(sessionId);
    ws?.send({ type: 'admin-attach', sessionId, mode });
  };

  const handleModeToggle = () => {
    const newMode = mode === 'read-only' ? 'interactive' : 'read-only';
    setMode(newMode);
    
    if (selectedSessionId) {
      ws?.send({ type: 'admin-detach', sessionId: selectedSessionId });
      ws?.send({ type: 'admin-attach', sessionId: selectedSessionId, mode: newMode });
    }
  };

  return (
    <div className="admin-panel">
      <h1>Shelltender Admin - Session Monitor</h1>
      
      <div className="admin-layout">
        <div className="session-list">
          <h2>Active Sessions</h2>
          {sessions.map(session => (
            <div 
              key={session.id}
              className={`session-item ${selectedSessionId === session.id ? 'selected' : ''}`}
              onClick={() => handleSessionSelect(session.id)}
            >
              <div className="session-id">{session.id.substring(0, 8)}...</div>
              <div className="session-command">{session.command}</div>
              <div className="session-time">
                {new Date(session.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
        
        <div className="terminal-container">
          {selectedSessionId ? (
            <>
              <div className="terminal-header">
                <span>Session: {selectedSessionId}</span>
                <button onClick={handleModeToggle} className={`mode-button ${mode}`}>
                  {mode === 'read-only' ? '👁️ Read Only' : '✏️ Interactive'}
                </button>
              </div>
              <AdminTerminal 
                sessionId={selectedSessionId} 
                mode={mode}
                ws={ws}
              />
            </>
          ) : (
            <div className="no-session">Select a session to monitor</div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Task 3.3: Create AdminTerminal Component
**File**: `apps/demo/src/components/AdminTerminal.tsx`

```typescript
import React from 'react';
import { Terminal } from '@shelltender/client';

interface AdminTerminalProps {
  sessionId: string;
  mode: 'read-only' | 'interactive';
  ws: WebSocketService | null;
}

export const AdminTerminal: React.FC<AdminTerminalProps> = ({ 
  sessionId, 
  mode,
  ws 
}) => {
  const handleInput = (data: string) => {
    if (mode === 'interactive' && ws) {
      ws.send({ 
        type: 'admin-input', 
        sessionId, 
        data 
      });
    }
  };

  return (
    <Terminal
      sessionId={sessionId}
      readOnly={mode === 'read-only'}
      onData={handleInput}
      className="admin-terminal"
    />
  );
};
```

### Task 3.4: Add Basic Styles
**File**: `apps/demo/src/styles/admin.css`

```css
.admin-panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.admin-layout {
  display: flex;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
}

.session-list {
  width: 300px;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow-y: auto;
  padding: 1rem;
}

.session-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
}

.session-item:hover {
  background: #f5f5f5;
}

.session-item.selected {
  background: #e3f2fd;
  border-color: #2196f3;
}

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

.mode-button {
  padding: 0.25rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.mode-button.read-only {
  background: #e8f5e9;
}

.mode-button.interactive {
  background: #fff3e0;
}

.admin-terminal {
  flex: 1;
}

.no-session {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}
```

## Testing Checklist

### Day 5: Testing

- [ ] Start Shelltender server
- [ ] Create 2-3 terminal sessions via normal UI
- [ ] Navigate to `/admin` (no auth required)
- [ ] Verify all sessions appear in list
- [ ] Click on each session - verify terminal output appears
- [ ] Test mode toggle - verify button changes
- [ ] In interactive mode, type commands - verify they execute
- [ ] Open multiple browser tabs on `/admin` - verify all receive updates
- [ ] Kill a session from normal UI - verify admin UI handles gracefully
- [ ] Test WebSocket reconnection after server restart

## What We're NOT Building

- ❌ Any authentication or login
- ❌ Any audit logging or tracking
- ❌ User ownership of sessions
- ❌ Performance monitoring
- ❌ HTTPS/TLS encryption
- ❌ Role-based permissions
- ❌ Database storage

## Success Criteria

1. Can monitor any active session
2. Can toggle between read-only and interactive
3. Multiple admins can view same session
4. No impact on regular users
5. Clean code ready for future auth/audit additions

## Total Time: 5 Days

- Day 1: Backend core
- Day 2: WebSocket integration  
- Days 3-4: UI implementation
- Day 5: Testing and fixes