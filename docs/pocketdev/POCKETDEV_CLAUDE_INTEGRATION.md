# PocketDev Claude Integration

## Overview
How PocketDev can use shelltender's terminal event system to monitor Claude Code sessions and provide a better mobile experience.

## Claude-Specific Pattern Registration

Using shelltender's general event system to detect Claude patterns:

```typescript
// In PocketDev's shelltender integration
class ClaudeMonitor {
  constructor(private shelltender: Shelltender) {}
  
  async setupClaudePatterns(sessionId: string) {
    // Detect Claude processing status
    const processingPattern = await this.shelltender.registerPattern({
      name: 'claude-processing',
      type: 'custom',
      pattern: (buffer, chunk) => {
        const match = chunk.match(/([·✢*✶✻✽✺●○◉◎])\s*(\w+)…\s*\((\d+s)\s*·.*?([\d.]+k?)\s*tokens/);
        if (match) {
          return {
            state: 'processing',
            action: match[2],
            duration: match[3],
            tokens: match[4],
            symbol: match[1]
          };
        }
        return null;
      }
    });
    
    // Detect Claude waiting for input
    const inputPattern = await this.shelltender.registerPattern({
      name: 'claude-input-box',
      type: 'custom',
      pattern: (buffer, chunk) => {
        // Look for input box with no status line
        if (chunk.includes('│ > ') && chunk.includes('╰') && 
            !chunk.includes('Transmuting') && !chunk.includes('Churning')) {
          return { state: 'waiting-for-input' };
        }
        return null;
      }
    });
    
    // Detect numbered options
    const optionsPattern = await this.shelltender.registerPattern({
      name: 'claude-options',
      type: 'regex',
      pattern: /^\s*(\d+)[.)] (.+)$/m,
      options: { multiline: true }
    });
    
    return { processingPattern, inputPattern, optionsPattern };
  }
}
```

## PocketDev UI Components

### Claude Status Widget
```tsx
function ClaudeStatusWidget({ sessionId }: { sessionId: string }) {
  const [claudeState, setClaudeState] = useState<ClaudeState>({ type: 'idle' });
  
  useEffect(() => {
    const unsubscribe = shelltender.subscribe(['custom-pattern'], (event) => {
      if (event.sessionId !== sessionId) return;
      
      switch (event.patternId) {
        case 'claude-processing':
          setClaudeState({
            type: 'processing',
            action: event.data.action,
            duration: event.data.duration,
            tokens: event.data.tokens
          });
          break;
          
        case 'claude-input-box':
          setClaudeState({ type: 'waiting' });
          // Trigger notification if needed
          break;
      }
    });
    
    return unsubscribe;
  }, [sessionId]);
  
  return <ClaudeStateIndicator state={claudeState} />;
}
```

### Smart Notifications
```typescript
class PocketDevNotifications {
  private lastState: Map<string, string> = new Map();
  
  handleClaudeEvent(sessionId: string, event: TerminalEvent) {
    const previous = this.lastState.get(sessionId);
    const current = event.data.state;
    
    // Only notify on transition from processing -> waiting
    if (previous === 'processing' && current === 'waiting-for-input') {
      this.sendNotification({
        title: 'Claude needs your input',
        body: `Session ${sessionId} is waiting for a response`,
        actions: [
          { title: 'Open', action: 'open-session' },
          { title: 'Dismiss', action: 'dismiss' }
        ]
      });
    }
    
    this.lastState.set(sessionId, current);
  }
}
```

## Task Automation

### Auto-pause on Processing
```typescript
// Automatically background sessions when Claude starts processing
function autoManageSessions(shelltender: Shelltender) {
  shelltender.subscribe(['custom-pattern'], (event) => {
    if (event.patternId === 'claude-processing' && event.data.duration === '0s') {
      // Claude just started processing
      console.log(`Claude started ${event.data.action} in session ${event.sessionId}`);
      
      // Could auto-switch to another task
      if (shouldAutoSwitch()) {
        shelltender.backgroundSession(event.sessionId);
        shelltender.focusNextPendingTask();
      }
    }
  });
}
```

## Mobile-Specific Features

### 1. Quick Actions Based on State
```typescript
function getQuickActions(claudeState: ClaudeState): QuickAction[] {
  switch (claudeState.type) {
    case 'waiting':
      return [
        { label: 'Yes', input: 'y\n' },
        { label: 'No', input: 'n\n' },
        { label: 'Continue', input: '\n' }
      ];
      
    case 'processing':
      return [
        { label: 'Interrupt', input: '\x03' }, // Ctrl+C
        { label: 'Background', action: 'background-session' }
      ];
      
    default:
      return [];
  }
}
```

### 2. Session Priority Based on Claude State
```typescript
function getSessionPriority(session: Session): number {
  const claudeState = getClaudeState(session.id);
  
  // Waiting for input = highest priority
  if (claudeState.type === 'waiting') return 100;
  
  // Processing = low priority (can work in background)
  if (claudeState.type === 'processing') return 10;
  
  // Idle = medium priority
  return 50;
}
```

## Benefits for PocketDev

1. **Smarter Task Switching**: Know when it's safe to switch tasks
2. **Reduced Context Switching**: Only notify when truly needed
3. **Better Mobile UX**: Quick actions based on Claude's state
4. **Efficient Workflows**: Auto-manage sessions based on processing state
5. **Clear Feedback**: Users always know what Claude is doing

## Implementation Notes

- All Claude-specific logic stays in PocketDev
- Shelltender provides generic pattern matching infrastructure
- Patterns are registered per-session (only monitor Claude sessions)
- Events flow through standard shelltender event system
- No Claude-specific code in shelltender core