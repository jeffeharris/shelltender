// Export components
export { Terminal } from './components/Terminal/index';
export { SessionManager } from './components/SessionManager/index';
export { SessionTabs } from './components/SessionTabs/index';
export { SessionList } from './components/SessionList';
export { TerminalEventMonitor } from './components/TerminalEventMonitor';

// Export mobile components
export { MobileApp, MobileTerminal, MobileSessionTabs, MobileBottomTabs } from './components/mobile';

// Export services
export { WebSocketService } from './services/WebSocketService';
export { TerminalEventService } from './services/TerminalEventService';
export type { EventCallback, UnsubscribeFn } from './services/TerminalEventService';

// Export hooks
export { useTerminalEvents } from './hooks/useTerminalEvents';
export { useWebSocket } from './hooks/useWebSocket';
export { useMobileDetection, useBreakpoint } from './hooks/useMobileDetection';
export { useTouchGestures, useTerminalTouchGestures } from './hooks/useTouchGestures';
export type { UseTerminalEventsReturn, UseTerminalEventsOptions } from './hooks/useTerminalEvents';
export type { MobileDetection } from './hooks/useMobileDetection';
export type { TouchGestureOptions } from './hooks/useTouchGestures';

// Export context
export { MobileProvider, useMobile } from './context/MobileContext';