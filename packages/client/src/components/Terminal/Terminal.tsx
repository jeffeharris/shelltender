import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import '../../styles/terminal.css';
import { WebSocketService } from '../../services/WebSocketService';
import type { TerminalData } from '@shelltender/core';

interface TerminalProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ sessionId, onSessionCreated }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      cursorInactiveStyle: 'none',
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, monospace',
      lineHeight: 1.0,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#000000',
      },
      scrollback: 10000,
      convertEol: true,
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(unicode11Addon);
    
    // Activate unicode version 11
    term.unicode.activeVersion = '11';

    // Open terminal
    term.open(terminalRef.current);
    
    // Fit terminal after a small delay to ensure proper sizing
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initialize WebSocket
    const ws = new WebSocketService(); // Uses constructor defaults
    wsRef.current = ws;

    // Handle terminal data messages
    // All terminal-related messages come through with their specific types
    // (output, create, connect, resize, error, etc.)
    const handleTerminalMessage = (data: TerminalData) => {
      switch (data.type) {
        case 'create':
          if (data.sessionId) {
            currentSessionIdRef.current = data.sessionId;
            if (onSessionCreated) {
              onSessionCreated(data.sessionId);
            }
          }
          break;
        case 'connect':
          if (data.scrollback) {
            // Clear terminal and restore scrollback
            term.clear();
            // Use write() to preserve exact formatting
            term.write(data.scrollback);
          }
          break;
        case 'output':
          if (data.data) {
            term.write(data.data);
          }
          break;
        case 'resize':
          if (data.cols && data.rows) {
            term.resize(data.cols, data.rows);
          }
          break;
        case 'error':
          console.error('Terminal error:', data.data);
          break;
      }
    };

    // Register handlers for each terminal message type
    ws.on('output', handleTerminalMessage);
    ws.on('create', handleTerminalMessage);
    ws.on('connect', handleTerminalMessage);
    ws.on('resize', handleTerminalMessage);
    ws.on('error', handleTerminalMessage);
    ws.on('bell', handleTerminalMessage);
    ws.on('exit', handleTerminalMessage);

    ws.onConnect(() => {
      setIsConnected(true);
      
      // Only handle session on first connect, not reconnects
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        
        // Handle initial session creation/connection
        if (!sessionId || sessionId === '') {
          // Create new session
          ws.send({
            type: 'create',
            cols: term.cols,
            rows: term.rows,
          });
        } else {
          // Connect to existing session
          currentSessionIdRef.current = sessionId;
          ws.send({ type: 'connect', sessionId });
        }
      } else if (currentSessionIdRef.current) {
        // On reconnect, reconnect to current session
        ws.send({ type: 'connect', sessionId: currentSessionIdRef.current });
      }
    });

    ws.onDisconnect(() => {
      setIsConnected(false);
    });

    // Connect WebSocket
    ws.connect();

    // Handle terminal input
    term.onData((data: string) => {
      if (currentSessionIdRef.current && ws.isConnected()) {
        ws.send({
          type: 'input',
          sessionId: currentSessionIdRef.current,
          data,
        });
      }
    });

    // Handle paste with Ctrl+V / Cmd+V
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        handlePaste();
        return false;
      }
      return true;
    });

    // Paste handler with fallback
    const handlePaste = async () => {
      try {
        // Try to read from clipboard
        const text = await navigator.clipboard.readText();
        if (text && currentSessionIdRef.current && ws.isConnected()) {
          ws.send({
            type: 'input',
            sessionId: currentSessionIdRef.current,
            data: text,
          });
        }
      } catch (err) {
        // Fallback: Show paste dialog
        const text = prompt('Paste your text here:');
        if (text && currentSessionIdRef.current && ws.isConnected()) {
          ws.send({
            type: 'input',
            sessionId: currentSessionIdRef.current,
            data: text,
          });
        }
      }
    };

    // Also handle right-click paste
    terminalRef.current.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      handlePaste();
    });

    // Handle resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (fitAddon) {
          fitAddon.fit();
          if (currentSessionIdRef.current && ws.isConnected()) {
            ws.send({
              type: 'resize',
              sessionId: currentSessionIdRef.current,
              cols: term.cols,
              rows: term.rows,
            });
          }
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize after mount
    setTimeout(handleResize, 100);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      ws.disconnect();
    };
  }, []); // Only run once on mount

  // Handle session changes after initial mount
  useEffect(() => {
    if (!wsRef.current || !wsRef.current.isConnected() || !isInitializedRef.current) {
      return;
    }

    // Skip if this is the initial render (handled in onConnect)
    if (sessionId === undefined) {
      return;
    }

    if (!sessionId || sessionId === '') {
      // User clicked "New Terminal" - create new session
      if (currentSessionIdRef.current !== null) {
        currentSessionIdRef.current = null;
        if (xtermRef.current) {
          xtermRef.current.clear();
        }
        wsRef.current.send({
          type: 'create',
          cols: xtermRef.current?.cols || 80,
          rows: xtermRef.current?.rows || 24,
        });
      }
    } else if (sessionId !== currentSessionIdRef.current) {
      // User selected a different existing session
      currentSessionIdRef.current = sessionId;
      if (xtermRef.current) {
        xtermRef.current.clear();
      }
      wsRef.current.send({ type: 'connect', sessionId });
    }
  }, [sessionId]);

  return (
    <div className="relative h-full w-full bg-black">
      {!isConnected && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm z-10">
          Disconnected
        </div>
      )}
      <div ref={terminalRef} className="terminal-container" />
    </div>
  );
};