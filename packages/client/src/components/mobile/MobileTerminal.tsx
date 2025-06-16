import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal } from '../Terminal';
import { useTerminalTouchGestures } from '../../hooks/useTouchGestures';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MobileTerminalInput } from './MobileTerminalInput';

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

  // Debug log
  useEffect(() => {
    console.log('MobileTerminal mounted with sessionId:', sessionId);
  }, [sessionId]);

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
      console.error('Failed to paste:', err);
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
    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
  }, []);

  // Setup touch gestures
  useTerminalTouchGestures(containerRef, {
    onCopy: handleCopy,
    onPaste: handlePaste,
    onNextSession: handleNextSession,
    onPrevSession: handlePrevSession,
    onContextMenu: handleContextMenu,
  });

  // Close context menu on tap outside
  useEffect(() => {
    const handleTap = (e: MouseEvent | TouchEvent) => {
      if (showContextMenu) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('click', handleTap);
    document.addEventListener('touchstart', handleTap);

    return () => {
      document.removeEventListener('click', handleTap);
      document.removeEventListener('touchstart', handleTap);
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
        <div 
          className="absolute bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50"
          style={{ 
            left: `${contextMenuPosition.x}px`, 
            top: `${contextMenuPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <button
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target"
            onClick={() => {
              handleCopy();
              setShowContextMenu(false);
            }}
          >
            Copy
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target"
            onClick={() => {
              handlePaste();
              setShowContextMenu(false);
            }}
          >
            Paste
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target"
            onClick={() => {
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
            onClick={() => {
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
      )}

      {/* Keyboard button - fixed position */}
      <button
        onClick={() => {
          const input = document.querySelector('textarea[aria-hidden="true"]') as HTMLTextAreaElement;
          if (input) {
            input.focus();
            // Also try to show keyboard programmatically
            input.click();
          }
        }}
        className="fixed bottom-20 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 mobile-touch-target"
        style={{ width: '60px', height: '60px' }}
      >
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 1v2h2V6H6zm4 0v2h2V6h-2zm4 0v2h1V6h-1zM6 10v2h2v-2H6zm4 0v2h2v-2h-2zm4 0v2h1v-2h-1zM8 14v1H6v-1h2zm2 0v1h4v-1h-4z" clipRule="evenodd" />
        </svg>
      </button>
      
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