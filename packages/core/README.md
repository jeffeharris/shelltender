# @shelltender/core

Shared types, interfaces, and constants for the Shelltender web-based persistent terminal system. This package provides the foundational type definitions used across all Shelltender packages.

## Installation

```bash
npm install @shelltender/core
```

## Overview

The `@shelltender/core` package exports TypeScript types and constants that define the contracts between Shelltender's server and client components. It ensures type safety and consistency across the entire Shelltender ecosystem.

## Usage

```typescript
import { 
  TerminalSession, 
  SessionOptions, 
  TerminalData,
  MessageType,
  DEFAULT_COLS,
  DEFAULT_ROWS 
} from '@shelltender/core';

// Create a typed session configuration
const options: SessionOptions = {
  command: '/bin/bash',
  cwd: '/home/user',
  cols: DEFAULT_COLS,
  rows: DEFAULT_ROWS,
  restrictToPath: '/home/user/sandbox',
  allowUpwardNavigation: false
};

// Handle typed WebSocket messages
const message: TerminalData = {
  type: MessageType.OUTPUT,
  sessionId: 'session-123',
  data: 'Hello from terminal!'
};
```

## API Reference

### Terminal Types

#### `TerminalSession`
Represents a terminal session with its metadata and configuration.

```typescript
interface TerminalSession {
  id: string;                    // Unique session identifier
  createdAt: string;            // ISO timestamp of creation
  lastAccessedAt: string;       // ISO timestamp of last access
  title?: string;               // Optional session title
  cols: number;                 // Terminal width in columns
  rows: number;                 // Terminal height in rows
  command?: string;             // Custom command (if any)
  args?: string[];              // Command arguments
  locked?: boolean;             // Whether session is locked
}
```

#### `TerminalEvent`
Represents events that occur within a terminal session.

```typescript
interface TerminalEvent {
  type: 'bell' | 'output-match' | 'exit' | 'error';
  sessionId: string;
  timestamp: string;
  data?: any;
}
```

### Session Types

#### `SessionOptions`
Configuration options for creating new terminal sessions.

```typescript
interface SessionOptions {
  // Basic options
  command?: string;              // Shell command to run
  args?: string[];              // Command arguments
  cwd?: string;                 // Working directory
  env?: Record<string, string>; // Environment variables
  locked?: boolean;             // Lock session from changes
  cols?: number;                // Terminal columns
  rows?: number;                // Terminal rows
  
  // Filesystem restrictions
  restrictToPath?: string;      // Confine to directory
  allowUpwardNavigation?: boolean; // Allow .. navigation
  blockedCommands?: string[];   // Forbidden commands
  readOnlyMode?: boolean;       // Block write operations
}
```

### WebSocket Types

#### `TerminalData`
WebSocket message structure for terminal communication.

```typescript
interface TerminalData {
  type: string;                 // Message type (see MessageType)
  sessionId?: string;           // Target session ID
  data?: string;                // Terminal input/output data
  cols?: number;                // Resize: new column count
  rows?: number;                // Resize: new row count
  scrollback?: string;          // Session history buffer
  exitCode?: number;            // Process exit code
  options?: SessionOptions;     // Session creation options
}
```

### Constants

#### `MessageType`
WebSocket message type constants.

```typescript
const MessageType = {
  OUTPUT: 'output',          // Terminal output data
  INPUT: 'input',            // User input data
  RESIZE: 'resize',          // Terminal resize event
  CREATE: 'create',          // Create new session
  CONNECT: 'connect',        // Connect to session
  DISCONNECT: 'disconnect',  // Disconnect from session
  ERROR: 'error',            // Error message
  BELL: 'bell',             // Terminal bell
  EXIT: 'exit'              // Session exit
} as const;
```

#### Terminal Defaults

```typescript
const DEFAULT_COLS = 80;           // Default terminal width
const DEFAULT_ROWS = 24;           // Default terminal height
const DEFAULT_BUFFER_SIZE = 10000; // Scrollback buffer lines
const DEFAULT_SHELL = /* platform-specific */; // Default shell command
```

## Type Safety

All types are exported with proper TypeScript definitions, enabling:
- Compile-time type checking
- IDE autocomplete and IntelliSense
- Consistent API contracts across packages
- Easy refactoring and maintenance

## Examples

### Creating a Restricted Session

```typescript
import { SessionOptions } from '@shelltender/core';

const sandboxOptions: SessionOptions = {
  restrictToPath: '/tmp/sandbox',
  allowUpwardNavigation: false,
  blockedCommands: ['rm', 'dd', 'mkfs'],
  readOnlyMode: false,
  env: {
    PS1: 'sandbox> '
  }
};
```

### Handling Terminal Events

```typescript
import { TerminalEvent } from '@shelltender/core';

function handleEvent(event: TerminalEvent) {
  switch (event.type) {
    case 'bell':
      console.log('Terminal bell at', event.timestamp);
      break;
    case 'exit':
      console.log('Session', event.sessionId, 'exited');
      break;
    case 'output-match':
      console.log('Pattern matched:', event.data);
      break;
  }
}
```

### Type-Safe WebSocket Communication

```typescript
import { TerminalData, MessageType } from '@shelltender/core';

// Send user input
const inputMessage: TerminalData = {
  type: MessageType.INPUT,
  sessionId: 'abc123',
  data: 'ls -la\n'
};

// Handle resize
const resizeMessage: TerminalData = {
  type: MessageType.RESIZE,
  sessionId: 'abc123',
  cols: 120,
  rows: 40
};
```

## Related Packages

- [@shelltender/server](../server) - Backend terminal session management using these types
- [@shelltender/client](../client) - React components that consume these types
- [shelltender](../shelltender) - Combined package including all types

## License

MIT