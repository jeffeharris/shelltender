import React, { useState, useEffect } from 'react';
import { WebSocketService } from '../../services/WebSocketService';
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