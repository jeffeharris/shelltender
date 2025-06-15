# Claude Status Relay System

> **NOTE: This document should be moved to the PocketDev repository as it contains Claude-specific implementation details. Shelltender provides generic terminal event detection through TERMINAL_EVENT_SYSTEM.md**

## Overview
Relay Claude Code's status information (processing state, action words, token count) to the shelltender app for better user awareness.

## Status Types to Relay

### 1. Processing Status
```typescript
interface ClaudeStatus {
  type: 'processing' | 'waiting' | 'idle';
  action?: string;        // "Transmuting", "Churning", etc.
  duration?: string;      // "73s"
  tokens?: string;        // "1.1k"
  symbol?: string;        // "✻", "·", etc.
}
```

### 2. Input State
```typescript
interface ClaudeInputState {
  type: 'input-required' | 'input-active';
  hasPrompt: boolean;     // Box with ">" visible
  promptContent?: string; // Current typed text
}
```

### 3. Options/Choices
```typescript
interface ClaudeOptions {
  type: 'options-available';
  options: Array<{
    number: number;
    text: string;
  }>;
}
```

## Implementation Approaches

### Approach 1: Real-time Terminal Parsing
Parse terminal output in BufferManager and emit events:

```typescript
// In BufferManager
class BufferManager {
  private parseClaudeStatus(data: string): ClaudeStatus | null {
    // Detect status lines
    const statusMatch = data.match(/([·✢*✶✻✽✺●○◉◎])\s*(\w+)…\s*\((\d+s)\s*·.*?([\d.]+k?)\s*tokens/);
    if (statusMatch) {
      return {
        type: 'processing',
        symbol: statusMatch[1],
        action: statusMatch[2],
        duration: statusMatch[3],
        tokens: statusMatch[4]
      };
    }
    
    // Detect input box
    if (data.includes('│ > ') && data.includes('╰')) {
      return { type: 'waiting' };
    }
    
    return null;
  }
}
```

### Approach 2: Dedicated Status Monitor
Add a separate process that monitors Claude sessions:

```typescript
class ClaudeStatusMonitor {
  constructor(private sessionManager: SessionManager) {}
  
  monitorSession(sessionId: string) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session || session.command !== 'claude') return;
    
    // Subscribe to output
    session.onData((data) => {
      const status = this.parseStatus(data);
      if (status) {
        this.emit('status-change', { sessionId, status });
      }
    });
  }
}
```

### Approach 3: Client-side Pattern Detection
Let the frontend detect patterns:

```typescript
// In Terminal component
useEffect(() => {
  if (!terminal) return;
  
  const disposable = terminal.onData((data) => {
    const status = detectClaudeStatus(data);
    if (status) {
      setClaudeStatus(status);
    }
  });
  
  return () => disposable.dispose();
}, [terminal]);
```

## WebSocket Protocol Extension

Add new message types for Claude status:

```typescript
// Server -> Client
{
  type: 'claude-status',
  sessionId: string,
  status: ClaudeStatus
}

// Enable/disable Claude monitoring
{
  type: 'monitor-claude',
  sessionId: string,
  enabled: boolean
}
```

## UI Components

### Status Indicator
Show Claude's current state in the UI:

```tsx
function ClaudeStatusIndicator({ status }: { status: ClaudeStatus }) {
  if (status.type === 'processing') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="animate-spin">{status.symbol}</span>
        <span>{status.action}...</span>
        <span>{status.duration} · {status.tokens} tokens</span>
      </div>
    );
  }
  
  if (status.type === 'waiting') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-500">
        <span>●</span>
        <span>Waiting for input</span>
      </div>
    );
  }
  
  return null;
}
```

### Notification System
Alert users when Claude needs input:

```typescript
// When Claude transitions from processing -> waiting
if (previousStatus.type === 'processing' && currentStatus.type === 'waiting') {
  // Show notification
  showNotification({
    title: 'Claude needs input',
    body: 'Claude has finished processing and is waiting for your response',
    icon: '/claude-icon.png'
  });
}
```

## Benefits

1. **User Awareness**: Users know when Claude is thinking vs waiting
2. **Better UX**: Can show progress indicators and estimated wait times
3. **Smart Notifications**: Only notify when Claude actually needs input
4. **Session Management**: Could auto-background sessions that are processing
5. **Mobile Experience**: Critical for PocketDev where user might not be watching

## Implementation Priority

1. **Phase 1**: Basic status detection and WebSocket relay
2. **Phase 2**: UI indicators and state visualization
3. **Phase 3**: Smart notifications and session management
4. **Phase 4**: Historical analytics (action patterns, timing)