export interface TerminalSession {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  title?: string;
  cols: number;
  rows: number;
  command?: string;
  args?: string[];
  locked?: boolean;
}

export interface SessionOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  locked?: boolean;
  cols?: number;
  rows?: number;
  
  // Filesystem restrictions
  restrictToPath?: string;          // Can't navigate outside this path
  allowUpwardNavigation?: boolean;  // Default false when restrictToPath is set
  blockedCommands?: string[];       // Commands to block (e.g., ['sudo', 'su'])
  readOnlyMode?: boolean;           // Block all write operations
}

export interface TerminalData {
  type: 'output' | 'input' | 'resize' | 'create' | 'connect' | 'disconnect' | 'error' | 'bell' | 'exit';
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
  scrollback?: string;
  exitCode?: number;
  options?: SessionOptions;  // For create message
}

export interface TerminalEvent {
  type: 'bell' | 'output-match' | 'exit' | 'error';
  sessionId: string;
  timestamp: Date;
  data?: any;
}