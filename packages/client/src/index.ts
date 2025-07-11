// Export components
// Export Terminal directly from source to avoid re-export issues
export { Terminal } from './components/Terminal/Terminal.js';
export type { TerminalHandle, TerminalTheme } from './components/Terminal/Terminal.js';
export { SessionManager } from './components/SessionManager/index.js';
export { SessionTabs } from './components/SessionTabs/index.js';
export { SessionList } from './components/SessionList.js';
export { TerminalEventMonitor } from './components/TerminalEventMonitor.js';

// Export convenience components
export { ShelltenderApp, QuickTerminal } from './ShelltenderApp.js';
export type { ShelltenderAppProps } from './ShelltenderApp.js';

// Export mobile components
export { MobileApp, MobileSessionTabs, MobileBottomTabs, VirtualKeyboard, KeySetEditor } from './components/mobile/index.js';

// Export Toast components
export { ToastProvider, useToast } from './components/Toast/index.js';

// Export services
export { WebSocketService } from './services/WebSocketService.js';
export type { WebSocketServiceConfig } from './services/WebSocketService.js';
export { TerminalEventService } from './services/TerminalEventService.js';
export type { EventCallback, UnsubscribeFn } from './services/TerminalEventService.js';

// Export hooks
export { useTerminalEvents } from './hooks/useTerminalEvents.js';
export { useWebSocket } from './hooks/useWebSocket.js';
export { useMobileDetection, useBreakpoint } from './hooks/useMobileDetection.js';
export { useTouchGestures, useTerminalTouchGestures } from './hooks/useTouchGestures.js';
export { useCustomKeySets } from './hooks/useCustomKeySets.js';
export { useShelltender } from './hooks/useShelltender.js';
export type { UseTerminalEventsReturn, UseTerminalEventsOptions } from './hooks/useTerminalEvents.js';
export type { MobileDetection } from './hooks/useMobileDetection.js';
export type { TouchGestureOptions } from './hooks/useTouchGestures.js';

// Export context
export { MobileProvider, useMobile } from './context/MobileContext.js';
export { WebSocketProvider, useWebSocketConfig } from './context/WebSocketContext.js';

// Export keyboard types
export type { 
  SpecialKeyType, 
  KeyDefinition, 
  KeySet, 
  KeyboardPreferences, 
  VirtualKeyboardProps,
  KeySetEditorProps 
} from './types/keyboard.js';

// Export keyboard constants
export { SPECIAL_KEY_SEQUENCES } from './constants/keySets.js';