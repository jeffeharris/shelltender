import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
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
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Initialize terminal
    const term = new XTerm({
      cursorBlink: mode === 'interactive',
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    // Handle input in interactive mode
    if (mode === 'interactive') {
      term.onData((data) => {
        if (ws) {
          ws.send({ 
            type: 'admin-input', 
            sessionId, 
            data 
          });
        }
      });
    }
    
    // Clean up
    return () => {
      term.dispose();
    };
  }, [sessionId, mode, ws]);
  
  // Listen for terminal data
  useEffect(() => {
    if (!ws || !xtermRef.current) return;
    
    const handleOutput = (data: any) => {
      if (data.sessionId === sessionId && data.type === 'output') {
        xtermRef.current?.write(data.data);
      }
    };
    
    ws.on('output', handleOutput);
    
    return () => {
      ws.off('output', handleOutput);
    };
  }, [ws, sessionId]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={terminalRef} 
      className="admin-terminal"
      style={{ height: '100%', width: '100%' }}
    />
  );
};