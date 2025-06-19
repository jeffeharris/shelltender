# Mobile Implementation Guide

## Quick Start

This guide provides practical implementation details for adding mobile support to Shelltender.

## 1. Mobile Detection Hook

```typescript
// packages/client/src/hooks/useMobileDetection.ts
import { useEffect, useState } from 'react';

interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  orientation: 'portrait' | 'landscape';
}

export function useMobileDetection(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isTablet = /iPad|Android.*Tab/.test(ua);
    const isMobile = isIOS || isAndroid;
    const isTouch = 'ontouchstart' in window;
    
    return {
      isMobile,
      isTablet,
      isTouch,
      isIOS,
      isAndroid,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  });

  useEffect(() => {
    const handleResize = () => {
      setDetection(prev => ({
        ...prev,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return detection;
}
```

## 2. Touch Gestures Hook

```typescript
// packages/client/src/hooks/useTouchGestures.ts
import { useRef, useEffect } from 'react';

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onLongPress?: (x: number, y: number) => void;
}

export function useTouchGestures<T extends HTMLElement>(
  handlers: GestureHandlers
) {
  const ref = useRef<T>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number }>();
  const longPressTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };

      // Long press detection
      if (handlers.onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          handlers.onLongPress!(touch.clientX, touch.clientY);
        }, 500);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      clearTimeout(longPressTimerRef.current);
      
      if (!touchStartRef.current) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      
      // Swipe detection (min 50px movement in < 300ms)
      if (deltaTime < 300) {
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        } else if (Math.abs(deltaY) > 50) {
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }
    };

    const handleTouchMove = () => {
      clearTimeout(longPressTimerRef.current);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchmove', handleTouchMove);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handlers]);

  return ref;
}
```

## 3. Mobile Terminal Component

```typescript
// packages/client/src/components/mobile/MobileTerminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import type { WebSocketService } from '../../services/WebSocketService';

interface MobileTerminalProps {
  wsService: WebSocketService;
  sessionId: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export const MobileTerminal: React.FC<MobileTerminalProps> = ({
  wsService,
  sessionId,
  onSwipeLeft,
  onSwipeRight,
  className
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal>();
  const { isMobile, isIOS } = useMobileDetection();
  
  const gestureRef = useTouchGestures<HTMLDivElement>({
    onSwipeLeft,
    onSwipeRight,
    onLongPress: (x, y) => {
      // Show context menu at position
      showContextMenu(x, y);
    }
  });

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      fontSize: isMobile ? 14 : 16,
      fontFamily: 'Menlo, Monaco, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff'
      },
      // Mobile-specific options
      scrollback: 5000, // Reduced for performance
      touchEventsEnabled: true,
      cursorBlink: !isMobile, // Disable blinking on mobile
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    xtermRef.current = term;

    // Handle virtual keyboard on iOS
    if (isIOS) {
      term.textarea?.setAttribute('autocapitalize', 'off');
      term.textarea?.setAttribute('autocorrect', 'off');
      term.textarea?.setAttribute('spellcheck', 'false');
    }

    // Fit terminal to container
    const handleResize = () => {
      fitAddon.fit();
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // WebSocket connection
    wsService.send({
      type: 'connect',
      sessionId
    });

    const handleData = (data: any) => {
      if (data.type === 'output' && data.sessionId === sessionId) {
        term.write(data.data);
      }
    };

    wsService.on('message', handleData);

    // Handle input
    const handleInput = term.onData((data) => {
      wsService.send({
        type: 'input',
        sessionId,
        data
      });
    });

    return () => {
      handleInput.dispose();
      wsService.off('message', handleData);
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [wsService, sessionId, isMobile, isIOS]);

  const showContextMenu = (x: number, y: number) => {
    // Implement context menu
    console.log('Show context menu at', x, y);
  };

  return (
    <div 
      ref={(el) => {
        terminalRef.current = el!;
        gestureRef.current = el!;
      }}
      className={`mobile-terminal ${className || ''}`}
      style={{ height: '100%', width: '100%' }}
    />
  );
};
```

## 4. Mobile Session Tabs

```typescript
// packages/client/src/components/mobile/MobileSessionTabs.tsx
import React, { useRef } from 'react';
import { SessionInfo } from '@shelltender/core';
import './MobileSessionTabs.css';

interface MobileSessionTabsProps {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  onNewSession: () => void;
}

export const MobileSessionTabs: React.FC<MobileSessionTabsProps> = ({
  sessions,
  activeSessionId,
  onSessionChange,
  onNewSession
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToActive = () => {
    const activeTab = scrollRef.current?.querySelector('.tab.active');
    activeTab?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  };

  React.useEffect(() => {
    scrollToActive();
  }, [activeSessionId]);

  return (
    <div className="mobile-session-tabs">
      <div className="tabs-scroll-container" ref={scrollRef}>
        {sessions.map(session => (
          <button
            key={session.id}
            className={`tab ${session.id === activeSessionId ? 'active' : ''}`}
            onClick={() => onSessionChange(session.id)}
          >
            <span className="tab-title">{session.name || 'Terminal'}</span>
            {session.id === activeSessionId && (
              <span className="tab-indicator" />
            )}
          </button>
        ))}
        <button className="tab tab-new" onClick={onNewSession}>
          <span className="tab-icon">+</span>
        </button>
      </div>
    </div>
  );
};
```

## 5. Virtual Keyboard Toolbar

```typescript
// packages/client/src/components/mobile/VirtualKeyboardBar.tsx
import React from 'react';
import './VirtualKeyboardBar.css';

interface VirtualKeyboardBarProps {
  onKey: (key: string) => void;
  isVisible: boolean;
}

const SPECIAL_KEYS = [
  { label: 'Tab', value: '\t' },
  { label: 'Esc', value: '\x1b' },
  { label: 'Ctrl', value: 'ctrl', modifier: true },
  { label: '↑', value: '\x1b[A' },
  { label: '↓', value: '\x1b[B' },
  { label: '←', value: '\x1b[D' },
  { label: '→', value: '\x1b[C' },
];

export const VirtualKeyboardBar: React.FC<VirtualKeyboardBarProps> = ({
  onKey,
  isVisible
}) => {
  const [ctrlPressed, setCtrlPressed] = React.useState(false);

  const handleKeyPress = (key: typeof SPECIAL_KEYS[0]) => {
    if (key.modifier) {
      setCtrlPressed(!ctrlPressed);
    } else if (ctrlPressed && key.label.length === 1) {
      // Send Ctrl+key
      const charCode = key.label.charCodeAt(0);
      onKey(String.fromCharCode(charCode - 64)); // Ctrl+A = 1, Ctrl+B = 2, etc.
      setCtrlPressed(false);
    } else {
      onKey(key.value);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="virtual-keyboard-bar">
      {SPECIAL_KEYS.map(key => (
        <button
          key={key.label}
          className={`key-button ${ctrlPressed && key.modifier ? 'active' : ''}`}
          onClick={() => handleKeyPress(key)}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
};
```

## 6. Mobile Styles

```css
/* packages/client/src/styles/mobile.css */

/* Base mobile styles */
@media (max-width: 768px) {
  .terminal-container {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height */
    display: flex;
    flex-direction: column;
  }

  /* Remove any margin/padding */
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* Prevent zoom on double tap */
  * {
    touch-action: manipulation;
  }

  /* Terminal adjustments */
  .xterm {
    padding: 4px;
  }

  .xterm-viewport {
    -webkit-overflow-scrolling: touch;
  }
}

/* Mobile session tabs */
.mobile-session-tabs {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  overflow: hidden;
}

.tabs-scroll-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tabs-scroll-container::-webkit-scrollbar {
  display: none;
}

.tab {
  flex: 0 0 auto;
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
  scroll-snap-align: center;
  position: relative;
  transition: color 0.2s;
}

.tab.active {
  color: var(--text-primary);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-color);
}

/* Virtual keyboard bar */
.virtual-keyboard-bar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.key-button {
  flex: 0 0 auto;
  min-width: 44px;
  height: 44px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.key-button:active {
  transform: scale(0.95);
  background: var(--bg-tertiary);
}

.key-button.active {
  background: var(--accent-color);
  color: white;
}

/* Safe area handling */
.mobile-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Landscape adjustments */
@media (max-width: 768px) and (orientation: landscape) {
  .mobile-session-tabs {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 200px;
    border-right: 1px solid var(--border-color);
    border-bottom: none;
  }

  .tabs-scroll-container {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .terminal-container {
    margin-left: 200px;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .tab {
    border: 1px solid currentColor;
  }
  
  .key-button {
    border-width: 2px;
  }
}

/* Dark mode adjustments */
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --border-color: #464647;
  --accent-color: #007acc;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f3f3f3;
    --bg-tertiary: #e8e8e8;
    --text-primary: #000000;
    --text-secondary: #666666;
    --border-color: #d4d4d4;
    --accent-color: #0066cc;
  }
}
```

## 7. PWA Configuration

```javascript
// packages/client/public/manifest.json
{
  "name": "Shelltender Terminal",
  "short_name": "Shelltender",
  "description": "Persistent web-based terminal",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1e1e1e",
  "background_color": "#1e1e1e",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 8. Mobile App Component

```typescript
// packages/client/src/components/mobile/MobileApp.tsx
import React, { useState } from 'react';
import { MobileTerminal } from './MobileTerminal';
import { MobileSessionTabs } from './MobileSessionTabs';
import { VirtualKeyboardBar } from './VirtualKeyboardBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import './MobileApp.css';

export const MobileApp: React.FC = () => {
  const { wsService, isConnected } = useWebSocket();
  const { orientation } = useMobileDetection();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Session management logic...

  const handleSwipeLeft = () => {
    // Switch to next session
    const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
    if (currentIndex < sessions.length - 1) {
      setActiveSessionId(sessions[currentIndex + 1].id);
    }
  };

  const handleSwipeRight = () => {
    // Switch to previous session
    const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
    if (currentIndex > 0) {
      setActiveSessionId(sessions[currentIndex - 1].id);
    }
  };

  return (
    <div className={`mobile-app ${orientation}`}>
      <MobileSessionTabs
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionChange={setActiveSessionId}
        onNewSession={createNewSession}
      />
      
      <div className="terminal-wrapper">
        {activeSessionId && (
          <MobileTerminal
            wsService={wsService}
            sessionId={activeSessionId}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        )}
      </div>
      
      <VirtualKeyboardBar
        isVisible={showKeyboard}
        onKey={(key) => {
          // Send key to terminal
          if (activeSessionId) {
            wsService.send({
              type: 'input',
              sessionId: activeSessionId,
              data: key
            });
          }
        }}
      />
      
      <button
        className="keyboard-toggle"
        onClick={() => setShowKeyboard(!showKeyboard)}
      >
        ⌨️
      </button>
    </div>
  );
};
```

## Next Steps

1. **Implement mobile detection** in the main App component
2. **Create responsive breakpoints** for all components
3. **Add touch gesture support** to existing Terminal component
4. **Test on real devices** using BrowserStack or similar
5. **Optimize performance** for mobile processors
6. **Add offline support** with service workers

## Testing Checklist

- [ ] iOS Safari (iPhone & iPad)
- [ ] Chrome Android (Phone & Tablet)
- [ ] Samsung Internet
- [ ] Firefox Mobile
- [ ] Opera Mobile
- [ ] Portrait orientation
- [ ] Landscape orientation
- [ ] Virtual keyboard behavior
- [ ] Copy/paste functionality
- [ ] Session switching gestures
- [ ] Long press context menu
- [ ] Pinch zoom (if implemented)
- [ ] Performance on older devices
- [ ] PWA installation
- [ ] Offline functionality