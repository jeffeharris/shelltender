export interface SessionOptions {
  id?: string;                      // Optional custom session ID
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