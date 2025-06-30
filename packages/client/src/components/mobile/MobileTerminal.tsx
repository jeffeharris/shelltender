import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal } from '../Terminal/index.js';
import { useTerminalTouchGestures } from '../../hooks/useTouchGestures.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { MobileTerminalInput } from './MobileTerminalInput.js';

interface MobileTerminalProps {
  sessionId: string;
  onSessionChange?: (direction: 'next' | 'prev') => void;
  onShowVirtualKeyboard?: () => void;
}

export function MobileTerminal({ 
  sessionId, 
  onSessionChange,
  onShowVirtualKeyboard 
}: MobileTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const { wsService } = useWebSocket();


  // Handle copy operation
  const handleCopy = useCallback(() => {
    // For now, we'll use the browser's built-in selection
    const selection = window.getSelection()?.toString();
    if (selection) {
      navigator.clipboard.writeText(selection);
      showToast('Copied to clipboard');
    }
  }, []);

  // Handle paste operation
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && wsService && sessionId) {
        // Send paste command through WebSocket
        wsService.send({
          type: 'input',
          sessionId,
          data: text,
        });
        showToast('Pasted from clipboard');
      }
    } catch (err) {
      showToast('Paste failed - check permissions');
    }
  }, [sessionId, wsService]);

  // Handle session navigation
  const handleNextSession = useCallback(() => {
    onSessionChange?.('next');
  }, [onSessionChange]);

  const handlePrevSession = useCallback(() => {
    onSessionChange?.('prev');
  }, [onSessionChange]);

  // Handle context menu
  const handleContextMenu = useCallback((x: number, y: number) => {
    // Menu dimensions
    const menuWidth = 200;
    const menuHeight = 180; // 4 items * ~45px each
    const margin = 10;
    
    // Simple positioning - show menu at touch point
    const adjustedX = Math.min(Math.max(margin, x), window.innerWidth - margin);
    const adjustedY = Math.min(Math.max(margin, y), window.innerHeight - menuHeight - margin);
    
    
    setContextMenuPosition({ x: adjustedX, y: adjustedY });
    setShowContextMenu(true);
  }, []);
  
  

  // Setup touch gestures
  useTerminalTouchGestures(containerRef, {
    onCopy: handleCopy,
    onPaste: handlePaste,
    onNextSession: handleNextSession,
    onPrevSession: handlePrevSession,
    onContextMenu: (x, y) => {
      handleContextMenu(x, y);
    },
  });

  // Close context menu on tap outside
  useEffect(() => {
    if (!showContextMenu) return;
    
    // Add a small delay before listening for close events
    // to prevent immediate closure after long press
    const timer = setTimeout(() => {
      const handleTap = (e: MouseEvent | TouchEvent) => {
        // Check if the tap is on the menu itself
        const target = e.target as HTMLElement;
        const isMenuClick = target.closest('.context-menu');
        
        if (!isMenuClick) {
          setShowContextMenu(false);
        }
      };

      document.addEventListener('click', handleTap);
      document.addEventListener('touchstart', handleTap);

      // Store cleanup function
      (window as any)._menuCleanup = () => {
        document.removeEventListener('click', handleTap);
        document.removeEventListener('touchstart', handleTap);
      };
    }, 100); // Small delay to prevent immediate closure

    return () => {
      clearTimeout(timer);
      if ((window as any)._menuCleanup) {
        (window as any)._menuCleanup();
        delete (window as any)._menuCleanup;
      }
    };
  }, [showContextMenu]);

  // Handle terminal input
  const handleInput = useCallback((text: string) => {
    if (wsService && sessionId) {
      wsService.send({
        type: 'input',
        sessionId,
        data: text,
      });
    }
  }, [wsService, sessionId]);

  // Handle special keys
  const handleSpecialKey = useCallback((key: string) => {
    if (!wsService || !sessionId) return;

    const keyMap: Record<string, string> = {
      'backspace': '\x7f',
      'escape': '\x1b',
      'up': '\x1b[A',
      'down': '\x1b[B',
      'left': '\x1b[D',
      'right': '\x1b[C',
      'ctrl-c': '\x03',
      'ctrl-d': '\x04',
      'ctrl-z': '\x1a',
      'ctrl-l': '\x0c',
      'ctrl-a': '\x01',
      'ctrl-e': '\x05',
      'ctrl-k': '\x0b',
      'ctrl-u': '\x15',
      'ctrl-w': '\x17',
    };

    const data = keyMap[key];
    if (data) {
      wsService.send({
        type: 'input',
        sessionId,
        data,
      });
    }
  }, [wsService, sessionId]);

  return (
    <div 
      ref={containerRef}
      className="mobile-terminal-container relative h-full w-full mobile-no-zoom"
    >
      <Terminal 
        sessionId={sessionId}
      />
      
      {/* Hidden input for mobile keyboard */}
      <MobileTerminalInput
        onInput={handleInput}
        onSpecialKey={handleSpecialKey}
      />

      {/* Context Menu */}
      {showContextMenu && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0" 
            style={{ zIndex: 9999 }}
            onClick={(e) => {
              setShowContextMenu(false);
            }}
          />
          
          {/* Menu */}
          <div 
            className="context-menu fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-2"
            style={{ 
              left: `${contextMenuPosition.x}px`, 
              top: `${contextMenuPosition.y}px`,
              zIndex: 10000,
              minWidth: '200px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <button
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCopy();
              setShowContextMenu(false);
            }}
          >
            Copy
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePaste();
              setShowContextMenu(false);
            }}
          >
            Paste
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              // Select all using keyboard shortcut
              if (wsService && sessionId) {
                wsService.send({
                  type: 'input',
                  sessionId,
                  data: '\x01', // Ctrl+A
                });
              }
              setShowContextMenu(false);
            }}
          >
            Select All
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              // Clear using keyboard shortcut
              if (wsService && sessionId) {
                wsService.send({
                  type: 'input',
                  sessionId,
                  data: '\x0c', // Ctrl+L
                });
              }
              setShowContextMenu(false);
            }}
          >
            Clear
          </button>
        </div>
        </>
      )}

      {/* Touch gesture hints */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <div className="bg-black bg-opacity-50 text-white text-xs p-2 rounded-lg flex flex-wrap gap-2 justify-center">
          <span>Swipe ← → to switch sessions</span>
          <span>•</span>
          <span>2 fingers tap to copy</span>
          <span>•</span>
          <span>3 fingers tap to paste</span>
        </div>
      </div>
    </div>
  );
}

// Simple toast notification
let activeToasts: HTMLDivElement[] = [];

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
  toast.textContent = message;
  document.body.appendChild(toast);
  activeToasts.push(toast);

  const removeToast = () => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
    activeToasts = activeToasts.filter(t => t !== toast);
  };

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(removeToast, 300);
  }, 2000);
}

// Clean up any remaining toasts on unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    activeToasts.forEach(toast => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
    activeToasts = [];
  });
}