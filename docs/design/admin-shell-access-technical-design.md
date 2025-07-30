# Admin Shell Access Technical Design - MVP

## Overview

This document outlines the technical design for implementing admin shell access in Shelltender for **single-developer use** without authentication or audit logging. The focus is on core functionality that enables monitoring and troubleshooting terminal sessions.

## MVP Scope

**Target User**: Single developer with direct server access  
**Security Model**: Trust-based, no authentication required  
**Primary Goal**: Enable terminal session monitoring and troubleshooting  
**Timeline**: 5 days implementation

## Architecture Overview

The admin shell access feature will be implemented using a **Simplified Session Proxy Pattern** that:
- Maintains separation between user sessions and admin viewers
- Provides read-only access by default with opt-in interactive mode
- Reuses existing infrastructure with minimal modifications
- No authentication or audit logging in MVP

### High-Level Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Admin Panel UI    │────▶│  WebSocket Server   │────▶│ AdminSessionProxy   │
│    (/admin route)   │     │  (admin messages)   │     │    (simplified)     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                                                    │
                                                                    ▼
                            ┌─────────────────────┐     ┌─────────────────────┐
                            │   SessionManager    │◀────│   BufferManager     │
                            │                     │     │                     │
                            └─────────────────────┘     └─────────────────────┘
```

## Detailed Design

### 1. Backend Components

#### 1.1 AdminSessionProxy (Simplified for MVP)
Location: `packages/server/src/admin/AdminSessionProxy.ts`

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

    this.sessionManager.writeToSession(sessionId, data);
  }

  getAttachedSessions(): AdminSessionHandle[] {
    return Array.from(this.attachedSessions.values());
  }
}
```

**Key Design Decisions:**
- Simple proxy without authentication or logging
- Maintains separation between admin actions and user sessions
- Supports multiple concurrent admin viewers per session

#### 1.2 Modifications to Existing Components

**SessionManager Modifications:**
```typescript
// Add to SessionManager.ts
interface SessionMetadata {
  id: string;
  command: string;
  args: string[];
  createdAt: Date;
  isActive: boolean;
}

class SessionManager {
  // Existing code...
  
  // New methods for admin access (no user tracking)
  getSessionMetadata(sessionId: string): SessionMetadata | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    return {
      id: sessionId,
      command: session.session.command || '/bin/bash',
      args: session.session.args || [],
      createdAt: session.session.createdAt,
      isActive: true
    };
  }
  
  getAllSessionMetadata(): SessionMetadata[] {
    return Array.from(this.sessions.keys())
      .map(id => this.getSessionMetadata(id))
      .filter(Boolean) as SessionMetadata[];
  }
}
```

**WebSocketServer Modifications:**
```typescript
// Add to WebSocketServer.ts
private adminProxy: AdminSessionProxy;
private adminClients: Map<string, Set<WebSocket>> = new Map();

// In constructor, initialize adminProxy
constructor(...) {
  // existing code...
  this.adminProxy = new AdminSessionProxy(this.sessionManager);
}

// Modify handleMessage to handle admin messages
private handleMessage(clientId: string, ws: any, data: WebSocketMessage): void {
  if (data.type.startsWith('admin-')) {
    return this.handleAdminMessage(clientId, ws, data as AdminWebSocketMessage);
  }
  
  // Existing message handling...
}

// Add admin message handler
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

**Core Types Addition:**
```typescript
// Add to packages/core/src/types.ts
export interface AdminWebSocketMessage {
  type: 'admin-attach' | 'admin-detach' | 'admin-input' | 'admin-list-sessions';
  sessionId?: string;
  mode?: 'read-only' | 'interactive';
  data?: string;
}
```

### 2. Frontend Components

#### 2.1 AdminPanel Component (New)
Location: `apps/demo/src/components/AdminPanel.tsx`

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

#### 2.2 AdminTerminal Component (Simplified)
Location: `apps/demo/src/components/AdminTerminal.tsx`

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

#### 2.3 Admin Styles
Location: `apps/demo/src/styles/admin.css`

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

## Implementation Timeline (MVP - 5 Days)

### Day 1: Backend Core
- Create AdminSessionProxy (simplified, no auth/audit)
- Add SessionManager metadata methods
- Set up basic admin message types in core package

### Day 2: WebSocket Integration  
- Add admin message handling to WebSocketServer
- Implement admin client tracking
- Ensure broadcasting includes admin viewers
- Test multi-viewer support

### Days 3-4: UI Implementation
- Create AdminPanel component with session list
- Implement AdminTerminal wrapper
- Add mode toggle (read-only/interactive)
- Style admin interface
- Set up /admin route

### Day 5: Testing & Polish
- Manual testing of all features
- Fix any bugs found
- Basic documentation
- Verify WebSocket reconnection

## Testing Checklist

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

## What's NOT in MVP

- ❌ Any authentication or login
- ❌ Any audit logging or tracking
- ❌ User ownership of sessions
- ❌ Performance monitoring
- ❌ HTTPS/TLS encryption
- ❌ Role-based permissions
- ❌ Database storage

## Future Enhancement Path

### Phase 2: Basic Security (When Needed)
- Add simple password protection
- Implement file-based audit logging
- Add session ownership tracking

### Phase 3: Enterprise Features
- Full authentication system
- Role-based access control  
- Database-backed audit trail
- Performance monitoring

### Phase 4: Advanced Features
- Session recording and playback
- Multi-tenant support
- Compliance modes (HIPAA, SOC2, etc.)

## Key MVP Design Decisions

1. **No Authentication**: Trust-based for single developer use
2. **Simple Architecture**: Minimal new components, maximum reuse
3. **Best-Effort Performance**: No formal monitoring or guarantees
4. **Clean Interfaces**: Easy to add security features later
5. **Focus on Core Value**: Monitor and interact with sessions

## Success Criteria

The MVP is successful when a developer can:
1. Access `/admin` without any authentication
2. See all active terminal sessions
3. Select and view any session's output in real-time
4. Toggle between read-only and interactive modes
5. Send commands to sessions when in interactive mode
6. Have multiple browser tabs viewing the same session