/**
 * Terminal Event System Types
 * Core types for pattern matching and event detection in terminal output
 */

/**
 * Base event interface for all terminal events
 */
export interface TerminalEvent {
  type: string;
  sessionId: string;
  timestamp: number;
}

/**
 * Event fired when a pattern matches terminal output
 */
export interface PatternMatchEvent extends TerminalEvent {
  type: 'pattern-match';
  patternId: string;
  patternName: string;
  match: string;
  position: number;
  groups?: Record<string, string>; // For regex capture groups
}

/**
 * Event for terminal output state changes
 */
export interface OutputStateEvent extends TerminalEvent {
  type: 'output-state';
  state: {
    hasOutput: boolean;
    idle: boolean;
    idleDuration?: number;
  };
}

/**
 * Event for ANSI escape sequence detection
 */
export interface AnsiSequenceEvent extends TerminalEvent {
  type: 'ansi-sequence';
  sequence: string;
  category: 'cursor' | 'color' | 'clear' | 'other';
  parsed?: {
    command?: string;
    params?: number[];
  };
}

/**
 * Event for custom pattern matches with arbitrary data
 */
export interface CustomPatternEvent extends TerminalEvent {
  type: 'custom-pattern';
  patternId: string;
  patternName: string;
  data: any;
}

/**
 * Union type of all terminal events
 */
export type AnyTerminalEvent = PatternMatchEvent | OutputStateEvent | AnsiSequenceEvent | CustomPatternEvent;

/**
 * Pattern matcher types
 */
export type PatternType = 'regex' | 'string' | 'ansi' | 'custom';

/**
 * Configuration for registering a pattern
 */
export interface PatternConfig {
  /** Unique name for the pattern */
  name: string;
  /** Type of pattern matcher to use */
  type: PatternType;
  /** Pattern to match - string, RegExp, or custom matcher function */
  pattern: string | RegExp | CustomMatcher;
  /** Optional configuration */
  options?: {
    /** Case sensitivity for string matching */
    caseSensitive?: boolean;
    /** Enable multiline mode for regex */
    multiline?: boolean;
    /** Debounce matching in milliseconds */
    debounce?: number;
    /** Persist pattern to disk (survives server restart) */
    persist?: boolean;
  };
}

/**
 * Result from a pattern match
 */
export interface PatternMatch {
  match: string;
  position: number;
  groups?: Record<string, string>;
}

/**
 * Custom matcher function type
 */
export type CustomMatcher = (data: string, buffer: string) => PatternMatch | null;

/**
 * WebSocket message types for event system
 */

/** Client -> Server: Register a new pattern */
export interface RegisterPatternMessage {
  type: 'register-pattern';
  sessionId: string;
  config: PatternConfig;
  requestId?: string; // For client correlation
}

/** Server -> Client: Pattern registration successful */
export interface PatternRegisteredMessage {
  type: 'pattern-registered';
  patternId: string;
  requestId?: string;
}

/** Client -> Server: Unregister a pattern */
export interface UnregisterPatternMessage {
  type: 'unregister-pattern';
  patternId: string;
  requestId?: string;
}

/** Server -> Client: Pattern unregistered */
export interface PatternUnregisteredMessage {
  type: 'pattern-unregistered';
  patternId: string;
  requestId?: string;
}

/** Server -> Client: Terminal event occurred */
export interface TerminalEventMessage {
  type: 'terminal-event';
  event: AnyTerminalEvent;
}

/** Client -> Server: Subscribe to event types */
export interface SubscribeEventsMessage {
  type: 'subscribe-events';
  eventTypes: string[];
  sessionId?: string; // Optional: filter by session
}

/** Client -> Server: Unsubscribe from events */
export interface UnsubscribeEventsMessage {
  type: 'unsubscribe-events';
  eventTypes: string[];
  sessionId?: string;
}

/**
 * Built-in pattern definitions
 */
export const BUILT_IN_PATTERNS = {
  /** Common shell prompts */
  PROMPT: {
    bash: /\$\s*$/,
    zsh: /[%>]\s*$/,
    fish: />\s*$/,
    generic: /[>$%#]\s*$/,
  },
  
  /** Error detection patterns */
  ERROR: {
    javascript: /Error:|TypeError:|ReferenceError:|SyntaxError:/,
    python: /Traceback|SyntaxError:|ValueError:|IndentationError:/,
    general: /error:|failed:|Error:|FAILED:/i,
    compilation: /error\s*(CS|TS)\d+:/i,
  },
  
  /** Progress indicators */
  PROGRESS: {
    percentage: /(\d+)%/,
    ratio: /(\d+)\/(\d+)/,
    dots: /\.{3,}/,
    spinner: /[|/\-\\]/,
    progressBar: /\[[\s=#-]*\]/,
  },
  
  /** Build/test patterns */
  BUILD: {
    success: /build\s+(succeeded|successful|complete)/i,
    failure: /build\s+(failed|error)/i,
    warning: /warning\s*(CS|TS)?\d*:/i,
  },
  
  /** Test result patterns */
  TEST: {
    jest: /Test Suites:\s*(\d+)\s*passed,\s*(\d+)\s*failed/,
    mocha: /(\d+)\s*passing.*(\d+)\s*failing/,
    generic: /(\d+)\s*passed.*(\d+)\s*failed/i,
  },
} as const;