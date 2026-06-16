export interface SessionOptions {
  id?: string;                      // Optional custom session ID
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  locked?: boolean;
  cols?: number;
  rows?: number;
  /**
   * Persist this session to the SessionStore (default true). Set false for
   * sessions whose durability is owned elsewhere — e.g. a `tmux attach`, where
   * tmux is the real persistence layer. Ephemeral sessions are never written to
   * disk, so a server restart can't restore a stale, dead-PTY buffer for them.
   */
  persist?: boolean;

  // Filesystem restrictions
  restrictToPath?: string;          // Can't navigate outside this path
  allowUpwardNavigation?: boolean;  // Default false when restrictToPath is set
  blockedCommands?: string[];       // Commands to block (e.g., ['sudo', 'su'])
  readOnlyMode?: boolean;           // Block all write operations
}