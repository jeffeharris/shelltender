import { SessionOptions } from './session.js';
import { PatternConfig, AnyTerminalEvent } from './events.js';

export interface TerminalData {
  type: 'output' | 'input' | 'resize' | 'create' | 'created' | 'connect' | 'disconnect' | 'error' | 'bell' | 'exit';
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
  scrollback?: string;
  exitCode?: number;
  options?: SessionOptions;  // For create message
  session?: any;  // For created message
  
  // Incremental update fields
  sequence?: number;  // For output messages
  lastSequence?: number;  // For connect responses
  incrementalData?: string;  // For incremental connect responses
  fromSequence?: number;  // For incremental connect responses
  useIncrementalUpdates?: boolean;  // For connect requests
}

// Event System WebSocket Messages
export interface RegisterPatternMessage {
  type: 'register-pattern';
  sessionId: string;
  config: PatternConfig;
  requestId?: string;
}

export interface PatternRegisteredMessage {
  type: 'pattern-registered';
  patternId: string;
  requestId?: string;
}

export interface UnregisterPatternMessage {
  type: 'unregister-pattern';
  patternId: string;
  requestId?: string;
}

export interface PatternUnregisteredMessage {
  type: 'pattern-unregistered';
  patternId: string;
  requestId?: string;
}

export interface TerminalEventMessage {
  type: 'terminal-event';
  event: AnyTerminalEvent;
}

export interface SubscribeEventsMessage {
  type: 'subscribe-events';
  eventTypes: string[];
  sessionId?: string;
}

export interface UnsubscribeEventsMessage {
  type: 'unsubscribe-events';
  eventTypes: string[];
  sessionId?: string;
}

export interface GetPatternsMessage {
  type: 'get-patterns';
  sessionId: string;
  requestId?: string;
}

export interface PatternsListMessage {
  type: 'patterns-list';
  patterns: Array<{
    patternId: string;
    config: PatternConfig;
    sessionId: string;
  }>;
  requestId?: string;
}

// Admin WebSocket Messages - Simple admin messages without auth
export interface AdminWebSocketMessage {
  type: 'admin-attach' | 'admin-detach' | 'admin-input' | 'admin-list-sessions';
  sessionId?: string;
  mode?: 'read-only' | 'interactive';
  data?: string;
}

export interface AdminSessionsListMessage {
  type: 'admin-sessions-list';
  sessions: Array<{
    id: string;
    command: string;
    args: string[];
    createdAt: Date;
    isActive: boolean;
  }>;
}

// Union type for all WebSocket messages
export type WebSocketMessage = 
  | TerminalData 
  | RegisterPatternMessage 
  | PatternRegisteredMessage 
  | UnregisterPatternMessage 
  | PatternUnregisteredMessage 
  | TerminalEventMessage
  | SubscribeEventsMessage
  | UnsubscribeEventsMessage
  | GetPatternsMessage
  | PatternsListMessage
  | AdminWebSocketMessage
  | AdminSessionsListMessage;