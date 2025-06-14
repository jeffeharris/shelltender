// WebSocket message types
export const MessageType = {
  OUTPUT: 'output',
  INPUT: 'input',
  RESIZE: 'resize',
  CREATE: 'create',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  BELL: 'bell',
  EXIT: 'exit'
} as const;

// Default terminal dimensions
export const DEFAULT_COLS = 80;
export const DEFAULT_ROWS = 24;

// Buffer settings
export const DEFAULT_BUFFER_SIZE = 10000;

// Session defaults
export const DEFAULT_SHELL = process.platform === 'win32' ? 'cmd.exe' : 'bash';