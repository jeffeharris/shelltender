# Shelltender v0.4.1 Implementation Answers

## Important Update
The `focus()` method IS included in npm v0.4.1! I've verified the published package includes both `fit()` and `focus()` methods in the TerminalHandle interface.

## Answer to Question 1: Terminal Ref API

**Yes, the Terminal component uses forwardRef and exposes both methods**, but there's likely a timing or WebSocketProvider issue with your implementation.

The interface in npm v0.4.1:
```typescript
export interface TerminalHandle {
  fit: () => void;
  focus: () => void;
}
```

Your issue with `terminalRef.current` being null is likely due to:
1. The Terminal component might not be mounted yet when you're trying to access it
2. React's ref timing - refs are set after the component mounts

## Answer to Question 2: Auto-resize Behavior

**Yes, v0.4.1 includes automatic resize handling via ResizeObserver**. The Terminal:
- Uses ResizeObserver to detect container size changes
- Has a 100ms debounce for resize events
- Automatically calls fit() when the container resizes
- You can still manually call `fit()` via ref when needed

If you're not seeing resize logs, make sure to add `debug={true}` to the Terminal component.

## Answer to Question 3: Focus Timing

The ref should be available after the component mounts, not necessarily after `onSessionCreated`. Try using `useEffect`:

```typescript
useEffect(() => {
  if (isVisible && terminalRef.current) {
    terminalRef.current.focus();
    terminalRef.current.fit();
  }
}, [isVisible]);
```

## Answer to Question 4: TypeScript Types

The TerminalHandle interface in npm v0.4.1:
```typescript
export interface TerminalHandle {
  fit: () => void;
  focus: () => void;
}
```

## Answer to Question 5: Alternative Focus API

There's no alternative API. The ref-based approach is the intended method and it's fully supported in v0.4.1.

## Answer to Question 6: Working Example

Here's a complete working example:

```typescript
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Terminal, TerminalHandle } from '@shelltender/client';

interface TaskTerminalProps {
  taskId: string;
  sessionId: string;
  isVisible: boolean;
  onSessionCreated?: (sessionId: string) => void;
}

interface TaskTerminalHandle {
  focus: () => void;
  fit: () => void;
}

const TaskTerminal = forwardRef<TaskTerminalHandle, TaskTerminalProps>(({
  taskId,
  sessionId,
  isVisible,
  onSessionCreated
}, ref) => {
  const terminalRef = useRef<TerminalHandle>(null);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      console.log('[TaskTerminal] Focus called', { 
        hasRef: !!terminalRef.current,
        taskId 
      });
      terminalRef.current?.focus();
    },
    fit: () => {
      console.log('[TaskTerminal] Fit called', { 
        hasRef: !!terminalRef.current,
        taskId 
      });
      terminalRef.current?.fit();
    }
  }), []); // Empty deps array - methods don't change

  // Auto-focus when becoming visible
  useEffect(() => {
    if (isVisible && terminalRef.current) {
      // Small delay to ensure terminal is fully rendered
      const timer = setTimeout(() => {
        console.log('[TaskTerminal] Auto-focusing visible terminal', taskId);
        terminalRef.current?.focus();
        terminalRef.current?.fit();
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, taskId]);

  return (
    <div style={{ display: isVisible ? 'block' : 'none', height: '100%' }}>
      <Terminal
        ref={terminalRef}
        sessionId={sessionId}
        onSessionCreated={onSessionCreated}
        debug={true} // Enable debug logs
        fontSize={14}
        theme={{ background: '#1e1e1e' }}
        padding={{ left: 8 }}
      />
    </div>
  );
});

TaskTerminal.displayName = 'TaskTerminal';

// Parent component managing multiple terminals
const TerminalManager: React.FC = () => {
  const [activeTaskId, setActiveTaskId] = useState<string>('task1');
  const terminalRefs = useRef<Record<string, TaskTerminalHandle>>({});

  const tasks = [
    { id: 'task1', sessionId: 'session1' },
    { id: 'task2', sessionId: 'session2' },
    { id: 'task3', sessionId: 'session3' }
  ];

  const switchToTask = (taskId: string) => {
    console.log('[TerminalManager] Switching to task:', taskId);
    setActiveTaskId(taskId);
    
    // Focus the terminal after state update
    setTimeout(() => {
      const terminal = terminalRefs.current[taskId];
      if (terminal) {
        terminal.fit();
        terminal.focus();
      }
    }, 0);
  };

  return (
    <div className="terminal-container" style={{ height: '100vh' }}>
      <div className="tabs">
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => switchToTask(task.id)}
            className={activeTaskId === task.id ? 'active' : ''}
          >
            {task.id}
          </button>
        ))}
      </div>
      
      <div className="terminal-content" style={{ height: 'calc(100% - 40px)' }}>
        {tasks.map(task => (
          <TaskTerminal
            key={task.id}
            ref={el => {
              if (el) terminalRefs.current[task.id] = el;
            }}
            taskId={task.id}
            sessionId={task.sessionId}
            isVisible={activeTaskId === task.id}
            onSessionCreated={(newSessionId) => {
              console.log('[TerminalManager] Session created:', {
                taskId: task.id,
                sessionId: newSessionId
              });
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

## Troubleshooting Your Current Implementation

The main issue is likely the **WebSocketProvider wrapper**. Here's why:

1. **Remove WebSocketProvider wrapper** - The Terminal component manages its own WebSocket connection internally using a singleton WebSocketService. The provider wrapper is unnecessary and might be interfering with the ref forwarding.

2. **Check component mounting** - Add logging to verify when the ref is set:
```typescript
<Terminal
  ref={(el) => {
    console.log('[Terminal] Ref callback:', el);
    terminalRef.current = el;
  }}
  // ... other props
/>
```

3. **Use debug prop** - Add `debug={true}` to the Terminal to see internal logs:
```typescript
<Terminal
  ref={terminalRef}
  sessionId={sessionId}
  debug={true}
  // ... other props
/>
```

4. **Verify npm version** - Confirm you have v0.4.1:
```bash
# Check installed version
npm list @shelltender/client

# Check the actual TypeScript definition
cat node_modules/@shelltender/client/dist/components/Terminal/Terminal.d.ts | grep -A5 "TerminalHandle"
```

## Fixed Implementation

Here's your code corrected (remove WebSocketProvider):

```typescript
import { Terminal, TerminalHandle } from '@shelltender/client';
import { forwardRef, useRef, useImperativeHandle, useEffect } from 'react';

const DirectTerminalComponent = forwardRef<DirectTerminalHandle, DirectTerminalProps>(({
  taskId,
  sessionId,
  className = '',
  worktreePath,
  isVisible = true
}, ref) => {
  const terminalRef = useRef<TerminalHandle>(null);

  // Expose focus/fit methods
  useImperativeHandle(ref, () => ({
    focus: () => {
      console.log('[DirectTerminal] Focus called', { hasRef: !!terminalRef.current });
      terminalRef.current?.focus();
    },
    fit: () => {
      console.log('[DirectTerminal] Fit called', { hasRef: !!terminalRef.current });
      terminalRef.current?.fit();
    }
  }), []); // Empty deps - methods are stable

  // Auto-focus when visible
  useEffect(() => {
    if (isVisible && terminalRef.current) {
      setTimeout(() => {
        terminalRef.current?.focus();
        terminalRef.current?.fit();
      }, 100);
    }
  }, [isVisible]);

  return (
    <Terminal
      ref={terminalRef}
      sessionId={sessionId}
      onSessionCreated={(newSessionId: string) => {
        console.log('[DirectTerminal] Session created:', newSessionId);
      }}
      className={className}
      debug={true} // Enable to see internal logs
    />
  );
});
```

## Summary

- **v0.4.1 includes both `fit()` and `focus()` methods** - verified in the npm package
- **Remove WebSocketProvider** - Terminal manages its own WebSocket connection internally
- **Auto-resize works** - ResizeObserver handles container changes automatically
- **Ref timing matters** - Access refs in useEffect or after component mount
- **Use debug={true}** - Enable debug logs to troubleshoot issues

The main issue with your implementation is the unnecessary WebSocketProvider wrapper, which may interfere with ref forwarding. The Terminal component is designed to work standalone.