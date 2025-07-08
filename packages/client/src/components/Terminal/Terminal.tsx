import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { useTerminalTouchGestures } from '../../hooks/useTouchGestures.js';
import { useMobileDetection } from '../../hooks/useMobileDetection.js';
import { useToast } from '../Toast/index.js';
import { ContextMenu, ContextMenuItem } from '../ContextMenu/index.js';
import { MobileTerminalInput } from '../mobile/MobileTerminalInput.js';
import { SPECIAL_KEYS, Z_INDEX } from '../../constants/mobile.js';
import type { TerminalData } from '@shelltender/core';
import type { WebSocketService } from '../../services/WebSocketService.js';

export interface TerminalTheme {
  background?: string;
  foreground?: string;
  cursor?: string;
  cursorAccent?: string;
  selection?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}

interface TerminalProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  onSessionChange?: (direction: 'next' | 'prev') => void;
  onShowVirtualKeyboard?: () => void;
  padding?: number | { left?: number; right?: number; top?: number; bottom?: number };
  debug?: boolean;
  fontSize?: number;
  fontFamily?: string;
  theme?: TerminalTheme;
  cursorStyle?: 'block' | 'underline' | 'bar';
  cursorBlink?: boolean;
  scrollback?: number;
}

export interface TerminalHandle {
  fit: () => void;
  focus: () => void;
}

const TerminalComponent = ({ 
  sessionId, 
  onSessionCreated,
  onSessionChange,
  onShowVirtualKeyboard,
  padding = { left: 8, right: 0, top: 0, bottom: 0 },
  debug = false,
  fontSize = 14,
  fontFamily = 'Consolas, Monaco, monospace',
  theme,
  cursorStyle = 'block',
  cursorBlink = true,
  scrollback = 10000
}: TerminalProps, ref: React.ForwardedRef<TerminalHandle>) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { wsService, isConnected: wsConnected } = useWebSocket();
  const wsRef = useRef<WebSocketService | null>(null);
  const isConnected = wsConnected;
  const currentSessionIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const isReadyRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mobile-specific state
  const { isMobile } = useMobileDetection();
  const { showToast } = useToast();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Handle copy operation
  const handleCopy = useCallback(() => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      navigator.clipboard.writeText(selection).catch((err) => {
        if (debug) {
          console.error('[Terminal] Copy failed:', err);
        }
        if (isMobile) showToast('Copy failed - check permissions');
      });
      if (isMobile) showToast('Copied to clipboard');
    }
  }, [isMobile, showToast, debug]);

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

  // Manual fit function with proper debouncing
  const performFit = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current) {
      if (debug) {
        console.log('[Terminal] Fit skipped - addon or terminal not ready');
      }
      return;
    }

    const container = containerRef.current;
    if (!container) {
      if (debug) {
        console.log('[Terminal] Fit skipped - container not available');
      }
      return;
    }

    // Check if container has valid dimensions
    const { clientWidth, clientHeight } = container;
    if (clientWidth === 0 || clientHeight === 0) {
      if (debug) {
        console.log('[Terminal] Fit skipped - container has zero dimensions', {
          width: clientWidth,
          height: clientHeight
        });
      }
      return;
    }

    try {
      if (debug) {
        console.log('[Terminal] Performing fit', {
          containerWidth: clientWidth,
          containerHeight: clientHeight,
          currentCols: xtermRef.current.cols,
          currentRows: xtermRef.current.rows,
        });
      }

      fitAddonRef.current.fit();

      if (debug) {
        console.log('[Terminal] Fit completed', {
          newCols: xtermRef.current.cols,
          newRows: xtermRef.current.rows,
        });
      }

      // Validate dimensions before sending to server
      const cols = xtermRef.current.cols;
      const rows = xtermRef.current.rows;
      if (cols > 0 && cols < 1000 && rows > 0 && rows < 1000) {
        // Send resize to server if connected
        if (currentSessionIdRef.current && wsRef.current?.isConnected()) {
          wsRef.current.send({
            type: 'resize',
            sessionId: currentSessionIdRef.current,
            cols,
            rows,
          });
        }
      } else if (debug) {
        console.warn('[Terminal] Invalid dimensions after fit', { cols, rows });
      }
    } catch (error) {
      if (debug) {
        console.error('[Terminal] Fit error:', error);
      }
    }
  }, [debug]);

  // Debounced fit function for resize events
  const debouncedFit = useCallback(() => {
    if (resizeDebounceRef.current) {
      clearTimeout(resizeDebounceRef.current);
    }
    
    resizeDebounceRef.current = setTimeout(() => {
      performFit();
    }, 100);
  }, [performFit]);

  // Focus the terminal
  const performFocus = useCallback(() => {
    if (!xtermRef.current) {
      if (debug) {
        console.log('[Terminal] Focus skipped - terminal not ready');
      }
      return;
    }

    try {
      xtermRef.current.focus();
      if (debug) {
        console.log('[Terminal] Terminal focused');
      }
    } catch (error) {
      if (debug) {
        console.error('[Terminal] Focus error:', error);
      }
    }
  }, [debug]);

  // Expose fit and focus methods via ref
  useImperativeHandle(ref, () => ({
    fit: performFit,
    focus: performFocus,
  }), [performFit, performFocus]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Build theme object with defaults
    const termTheme = {
      background: theme?.background || '#000000',
      foreground: theme?.foreground || '#ffffff',
      cursor: theme?.cursor || '#ffffff',
      cursorAccent: theme?.cursorAccent || '#000000',
      ...(theme?.selection && { selection: theme.selection }),
      ...(theme?.black && { black: theme.black }),
      ...(theme?.red && { red: theme.red }),
      ...(theme?.green && { green: theme.green }),
      ...(theme?.yellow && { yellow: theme.yellow }),
      ...(theme?.blue && { blue: theme.blue }),
      ...(theme?.magenta && { magenta: theme.magenta }),
      ...(theme?.cyan && { cyan: theme.cyan }),
      ...(theme?.white && { white: theme.white }),
      ...(theme?.brightBlack && { brightBlack: theme.brightBlack }),
      ...(theme?.brightRed && { brightRed: theme.brightRed }),
      ...(theme?.brightGreen && { brightGreen: theme.brightGreen }),
      ...(theme?.brightYellow && { brightYellow: theme.brightYellow }),
      ...(theme?.brightBlue && { brightBlue: theme.brightBlue }),
      ...(theme?.brightMagenta && { brightMagenta: theme.brightMagenta }),
      ...(theme?.brightCyan && { brightCyan: theme.brightCyan }),
      ...(theme?.brightWhite && { brightWhite: theme.brightWhite }),
    };

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: cursorBlink,
      cursorStyle: cursorStyle,
      cursorInactiveStyle: 'none',
      fontSize: fontSize,
      fontFamily: fontFamily,
      lineHeight: 1.0,
      theme: termTheme,
      scrollback: scrollback,
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
    
    // Store refs immediately so they're available for fit function
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    // Wait for layout to stabilize before initial fit with retry mechanism
    const attemptInitialFit = (retries = 5) => {
      if (retries === 0) {
        if (debug) {
          console.error('[Terminal] Failed to fit after 5 retries');
        }
        return;
      }
      
      const container = containerRef.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() => attemptInitialFit(retries - 1));
        return;
      }
      
      if (debug) {
        console.log('[Terminal] Performing initial fit after layout');
      }
      performFit();
    };
    
    requestAnimationFrame(() => attemptInitialFit());

    // Use shared WebSocket service from context
    if (!wsService) {
      console.error('[Terminal] WebSocket service not available');
      return;
    }
    const ws = wsService;
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

    // Handle session initialization
    const initializeSession = () => {
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
    };

    // If already connected, initialize immediately
    if (ws.isConnected()) {
      initializeSession();
    }

    // Also handle future connections
    ws.onConnect(() => {
      initializeSession();
    });

    // Note: We don't need onDisconnect or connect() since the shared service
    // manages its own lifecycle and we're using isConnected from the hook

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
    let contextMenuHandler: ((e: Event) => void) | null = null;
    if (!isMobile && terminalRef.current) {
      contextMenuHandler = (e: Event) => {
        e.preventDefault();
        handlePaste();
      };
      terminalRef.current.addEventListener('contextmenu', contextMenuHandler);
    }

    // Set up ResizeObserver for container-based resizing
    if (containerRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === containerRef.current) {
            if (debug) {
              console.log('[Terminal] ResizeObserver detected size change', {
                width: entry.contentRect.width,
                height: entry.contentRect.height,
              });
            }
            debouncedFit();
          }
        }
      });
      
      resizeObserverRef.current.observe(containerRef.current);
    }
    
    // Also listen to window resize as fallback
    const handleWindowResize = () => {
      if (debug) {
        console.log('[Terminal] Window resize detected');
      }
      debouncedFit();
    };
    
    window.addEventListener('resize', handleWindowResize);

    // Cleanup
    return () => {
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);
      
      // Remove context menu handler if it was added
      if (contextMenuHandler && terminalRef.current) {
        terminalRef.current.removeEventListener('contextmenu', contextMenuHandler);
      }
      
      // Remove all WebSocket event listeners
      ws.off('output', handleTerminalMessage);
      ws.off('created', handleTerminalMessage);
      ws.off('connect', handleTerminalMessage);
      ws.off('resize', handleTerminalMessage);
      ws.off('error', handleTerminalMessage);
      ws.off('bell', handleTerminalMessage);
      ws.off('exit', handleTerminalMessage);
      
      term.dispose();
      // Note: We don't disconnect the shared WebSocket service
      // as it may be used by other components
    };
  }, [isMobile, debug, performFit, debouncedFit, fontSize, fontFamily, theme, cursorStyle, cursorBlink, scrollback, padding, handlePaste]); // Include all dependencies

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
      <div 
        ref={terminalRef} 
        className="terminal-container" 
        style={{
          paddingLeft: typeof padding === 'number' ? padding : padding.left || 0,
          paddingRight: typeof padding === 'number' ? padding : padding.right || 0,
          paddingTop: typeof padding === 'number' ? padding : padding.top || 0,
          paddingBottom: typeof padding === 'number' ? padding : padding.bottom || 0,
        }}
      />
      
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

// Export Terminal as a ForwardRef component
// Using Object.assign to preserve the forwardRef wrapper from bundler optimizations
export const Terminal = Object.assign(
  forwardRef<TerminalHandle, TerminalProps>(TerminalComponent),
  { displayName: 'Terminal' }
) as React.ForwardRefExoticComponent<TerminalProps & React.RefAttributes<TerminalHandle>>;