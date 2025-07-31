# Admin Shell Access MVP Implementation Plan

## Overview

This document provides a step-by-step implementation plan for adding admin shell access to Shelltender. The implementation is designed for a single developer use case with clean interfaces for future authentication and auditing features.

## Context

- **Technical Design**: See `/docs/design/admin-shell-access-technical-design.md`
- **Requirements**: See `/docs/requirements/admin-shell-access.md`
- **MVP Reconciliation**: See `/docs/requirements/admin-shell-access-mvp-reconciliation.md`
- **Simplified Implementation**: See `/docs/implementation/admin-shell-access-mvp-simplified.md`
- **Approach**: MVP implementation without authentication or audit logging, but with clean interfaces for future additions

## MVP Scope

**Target User**: Single developer with direct server access  
**Security Model**: Trust-based, no authentication required  
**Primary Goal**: Enable terminal session monitoring and troubleshooting  
**Timeline**: 5 days implementation

## Implementation Phases

### Phase 1: Backend Core (Day 1)

**Goal**: Create basic infrastructure for admin session access

#### Task 1.1: Create AdminSessionProxy
**File**: `packages/server/src/admin/AdminSessionProxy.ts`

```typescript
import { EventEmitter } from 'events';
import { SessionManager } from '../SessionManager';

interface IAdminAccess {
  attachToSession(sessionId: string, mode: 'read-only' | 'interactive'): void;
  detachFromSession(sessionId: string): void;
  writeToSession(sessionId: string, data: string): void;
}

interface AdminSessionHandle {
  sessionId: string;
  mode: 'read-only' | 'interactive';
  attachedAt: Date;
}

export class AdminSessionProxy extends EventEmitter implements IAdminAccess {
  private attachedSessions: Map<string, AdminSessionHandle> = new Map();
  
  constructor(
    private sessionManager: SessionManager,
    // Future: add these when needed
    // private authService?: IAuthService,
    // private auditLogger?: IAuditLogger
  ) {
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

#### Task 1.2: Modify SessionManager
**File**: `packages/server/src/SessionManager.ts`

Add to existing SessionManager:
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
  const session = this.getSession(sessionId);
  if (!session) return null;
  
  return {
    id: sessionId,
    command: session.command || '/bin/bash',
    args: session.args || [],
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

#### Testing Checklist:
- [ ] AdminSessionProxy can be instantiated
- [ ] SessionManager modifications don't break existing functionality
- [ ] Can retrieve session metadata

### Phase 2: WebSocket Integration (Day 2)

**Goal**: Enable real-time communication for admin access

#### Task 2.1: Extend WebSocket Message Types
**File**: `packages/core/src/types.ts`

Add admin message types:
```typescript
// Simple admin messages without auth
export interface AdminWebSocketMessage {
  type: 'admin-attach' | 'admin-detach' | 'admin-input' | 'admin-list-sessions';
  sessionId?: string;
  mode?: 'read-only' | 'interactive';
  data?: string;
}
```

#### Task 2.2: Handle Admin Messages in WebSocketServer
**File**: `packages/server/src/WebSocketServer.ts`

Add to constructor and modify handleMessage method:
```typescript
// Add to constructor
private adminProxy: AdminSessionProxy;
private adminClients: Map<string, Set<WebSocket>> = new Map();

// In constructor, initialize adminProxy
constructor(...) {
  // existing code...
  this.adminProxy = new AdminSessionProxy(this.sessionManager);
}

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
```

#### Task 2.3: Forward Session Data to Admin Clients
Modify the session data broadcasting to include admin viewers:
```typescript
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

#### Testing Checklist:
- [ ] Admin can list all sessions via WebSocket
- [ ] Admin can attach to a session
- [ ] Admin receives real-time terminal output
- [ ] Admin can detach from session
- [ ] Interactive mode allows input

### Phase 3: Simple UI (Days 3-4)

**Goal**: Create simple admin interface

#### Task 3.1: Create Admin Route
**File**: `apps/demo/src/App.tsx` or router configuration

Add route for admin panel:
```typescript
<Route path="/admin" element={<AdminPanel />} />
```

#### Task 3.2: Create AdminPanel Component
**File**: `packages/client/src/components/admin/AdminPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { AdminSessionList } from './AdminSessionList';
import { AdminTerminal } from './AdminTerminal';

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

#### Task 3.3: Create AdminTerminal Component
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

#### Task 3.4: Add Basic Styles
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

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
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

#### Testing Checklist:
- [ ] Admin panel loads at `/admin`
- [ ] Session list displays all active sessions
- [ ] Clicking a session shows its terminal output
- [ ] Mode toggle switches between read-only and interactive
- [ ] Terminal component works with admin WebSocket messages

### Phase 4: Testing & Polish (Day 5)

**Goal**: Handle errors and edge cases

#### Task 4.1: Error Handling
- Handle WebSocket disconnection/reconnection
- Show error when session doesn't exist
- Handle session termination while viewing

#### Task 4.2: Basic Documentation
Create `docs/admin-access.md` with:
- How to access admin panel
- How to view sessions
- How to enable interactive mode
- Architecture overview for future developers

#### Task 4.3: Manual Testing Checklist
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

## Future Enhancement Placeholders

### Authentication Interface
```typescript
interface IAuthService {
  validateAdmin(token: string): Promise<boolean>;
  checkPermission(user: User, permission: string): boolean;
}
```

### Audit Logging Interface
```typescript
interface IAuditLogger {
  logAccess(entry: AuditEntry): Promise<void>;
  logCommand(sessionId: string, command: string): Promise<void>;
}
```

### How to Add Auth Later
1. Implement IAuthService
2. Inject into AdminSessionProxy constructor
3. Add auth checks in WebSocket handler
4. Add login UI and token management

## What We're NOT Building

- ❌ Any authentication or login
- ❌ Any audit logging or tracking
- ❌ User ownership of sessions
- ❌ Performance monitoring
- ❌ HTTPS/TLS encryption
- ❌ Role-based permissions
- ❌ Database storage

## Implementation Notes

- Start with Phase 1 and verify basic functionality works
- Each phase builds on the previous one
- Keep commits small and focused
- Test manually after each major change
- Don't over-engineer - this is an MVP for developer use

## Success Criteria

- [ ] Can view any active terminal session from `/admin`
- [ ] Can toggle between read-only and interactive mode
- [ ] Multiple admin viewers can watch the same session
- [ ] No disruption to normal terminal users
- [ ] Clean code structure for future enhancements

## Total Time: 5 Days

- Day 1: Backend core
- Day 2: WebSocket integration  
- Days 3-4: UI implementation
- Day 5: Testing and fixes