import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebSocketService } from '../../services/WebSocketService.js';
import { useTerminalTouchGestures } from '../../hooks/useTouchGestures.js';
import { useMobileDetection } from '../../hooks/useMobileDetection.js';
import { useToast } from '../Toast/index.js';
import { ContextMenu, ContextMenuItem } from '../ContextMenu/index.js';
import { MobileTerminalInput } from '../mobile/MobileTerminalInput.js';
import { SPECIAL_KEYS, Z_INDEX } from '../../constants/mobile.js';
import type { TerminalData } from '@shelltender/core';

interface TerminalProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  onSessionChange?: (direction: 'next' | 'prev') => void;
  onShowVirtualKeyboard?: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  sessionId, 
  onSessionCreated,
  onSessionChange,
  onShowVirtualKeyboard 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const isReadyRef = useRef(false);
  
  // Mobile-specific state
  const { isMobile } = useMobileDetection();
  const { showToast } = useToast();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Handle copy operation
  const handleCopy = useCallback(() => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      navigator.clipboard.writeText(selection);
      if (isMobile) showToast('Copied to clipboard');
    }
  }, [isMobile, showToast]);

  // Handle paste operation
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && currentSessionIdRef.current && wsRef.current?.isConnected()) {
        wsRef.current.send({
          type: 'input',
          sessionId: currentSessionIdRef.current,
          data: text,
        });
        if (isMobile) showToast('Pasted from clipboard');
      }
    } catch (err) {
      if (isMobile) {
        showToast('Paste failed - check permissions');
      } else {
        // Desktop fallback
        const text = prompt('Paste your text here:');
        if (text && currentSessionIdRef.current && wsRef.current?.isConnected()) {
          wsRef.current.send({
            type: 'input',
            sessionId: currentSessionIdRef.current,
            data: text,
          });
        }
      }
    }
  }, [isMobile, showToast]);

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    { label: 'Copy', action: handleCopy },
    { label: 'Paste', action: handlePaste },
    { 
      label: 'Select All', 
      action: () => {
        if (wsRef.current && currentSessionIdRef.current) {
          wsRef.current.send({
            type: 'input',
            sessionId: currentSessionIdRef.current,
            data: SPECIAL_KEYS['ctrl-a'],
          });
        }
      }
    },
    { 
      label: 'Clear', 
      action: () => {
        if (wsRef.current && currentSessionIdRef.current) {
          wsRef.current.send({
            type: 'input',
            sessionId: currentSessionIdRef.current,
            data: SPECIAL_KEYS['ctrl-l'],
          });
        }
      }
    },
  ];

  // Mobile touch gestures
  const touchOptions = {
    onCopy: handleCopy,
    onPaste: handlePaste,
    onNextSession: () => onSessionChange?.('next'),
    onPrevSession: () => onSessionChange?.('prev'),
    onContextMenu: (x: number, y: number) => {
      setContextMenuPosition({ x, y });
      setShowContextMenu(true);
    },
  };
  
  // Only use touch gestures on mobile devices
  useTerminalTouchGestures(containerRef, isMobile ? touchOptions : {});

  // Mobile input handlers
  const handleMobileInput = useCallback((text: string) => {
    if (wsRef.current && currentSessionIdRef.current) {
      wsRef.current.send({
        type: 'input',
        sessionId: currentSessionIdRef.current,
        data: text,
      });
    }
  }, []);

  const handleSpecialKey = useCallback((key: string) => {
    const data = SPECIAL_KEYS[key as keyof typeof SPECIAL_KEYS];
    if (data && wsRef.current && currentSessionIdRef.current) {
      wsRef.current.send({
        type: 'input',
        sessionId: currentSessionIdRef.current,
        data,
      });
    }
  }, []);

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
    const ws = new WebSocketService();
    wsRef.current = ws;

    // Handle terminal data messages
    const handleTerminalMessage = (data: TerminalData) => {
      switch (data.type) {
        case 'created':
          if (data.sessionId) {
            currentSessionIdRef.current = data.sessionId;
            isReadyRef.current = true;
            if (onSessionCreated) {
              onSessionCreated(data.sessionId);
            }
          }
          break;
        case 'connect':
          if (data.scrollback) {
            term.clear();
            term.write(data.scrollback);
          }
          isReadyRef.current = true;
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
          // Terminal error occurred
          break;
      }
    };

    // Register handlers for each terminal message type
    ws.on('output', handleTerminalMessage);
    ws.on('created', handleTerminalMessage);
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
          isReadyRef.current = true;
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
      if (!isReadyRef.current) {
        return; // Silently block input until ready
      }
      if (currentSessionIdRef.current && ws.isConnected()) {
        ws.send({
          type: 'input',
          sessionId: currentSessionIdRef.current,
          data,
        });
      }
    });

    // Handle paste with Ctrl+V / Cmd+V (desktop only)
    if (!isMobile) {
      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
          event.preventDefault();
          handlePaste();
          return false;
        }
        return true;
      });
    }

    // Handle right-click paste (desktop only)
    if (!isMobile && terminalRef.current) {
      terminalRef.current.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handlePaste();
      });
    }

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
  }, [isMobile]); // Include isMobile in deps

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
        isReadyRef.current = false;
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
      isReadyRef.current = true;
      if (xtermRef.current) {
        xtermRef.current.clear();
      }
      wsRef.current.send({ type: 'connect', sessionId });
    }
  }, [sessionId]);

  return (
    <div 
      ref={containerRef}
      className={`relative h-full w-full bg-black ${isMobile ? 'mobile-terminal-container mobile-no-zoom' : ''}`}
    >
      {!isConnected && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm" style={{ zIndex: Z_INDEX.TERMINAL }}>
          Disconnected
        </div>
      )}
      <div ref={terminalRef} className="terminal-container" />
      
      {/* Mobile-specific UI */}
      {isMobile && (
        <>
          {/* Hidden input for mobile keyboard */}
          <MobileTerminalInput
            onInput={handleMobileInput}
            onSpecialKey={handleSpecialKey}
          />

          {/* Context Menu */}
          {showContextMenu && (
            <ContextMenu
              x={contextMenuPosition.x}
              y={contextMenuPosition.y}
              items={contextMenuItems}
              onClose={() => setShowContextMenu(false)}
            />
          )}

          {/* Touch gesture hints */}
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none" style={{ zIndex: Z_INDEX.GESTURE_HINTS }}>
            <div className="bg-black bg-opacity-50 text-white text-xs p-2 rounded-lg flex flex-wrap gap-2 justify-center">
              <span>Swipe ← → to switch sessions</span>
              <span>•</span>
              <span>2 fingers tap to copy</span>
              <span>•</span>
              <span>3 fingers tap to paste</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};