import React from 'react';
import { Terminal } from '../Terminal';
import { WebSocketService } from '../../services/WebSocketService';

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