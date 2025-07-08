# Shelltender v0.4.3 Terminal Ref Investigation

## Issue Summary

The pocketdev team reports that the Terminal component ref callback is never called in v0.4.3, preventing access to `focus()` and `fit()` methods.

## Test Results

Our tests show that the ref callback IS working correctly:

```
[Test] Ref callback called with: { fit: [Function], focus: [Function] }
[DirectTerminal] Terminal ref callback: { fit: [Function], focus: [Function] }
```

The ref is properly exposed via `useImperativeHandle` at the component level, not inside any conditional logic.

## Potential Causes

### 1. React 19 Compatibility

The pocketdev team is using React 19.1.0. There might be a compatibility issue with:
- `forwardRef` behavior changes
- `useImperativeHandle` timing
- Ref callback invocation timing

### 2. Build/Bundle Issue

The published v0.4.3 package might have a build issue where:
- The ref forwarding is stripped out
- Tree-shaking removes necessary code
- Module resolution differs in their environment

### 3. WebSocket Service Initialization

If the WebSocket service fails to initialize, there's an early return in the main effect:
```typescript
if (!wsService) {
  console.error('[Terminal] WebSocket service not available');
  return;
}
```

However, this is AFTER `useImperativeHandle`, so the ref should still be set.

### 4. Multiple React Instances

If there are multiple React instances in their bundle, ref forwarding might break.

## Debugging Steps for Pocketdev Team

1. **Check Console Errors**:
   ```javascript
   // Add this to see all errors
   window.addEventListener('error', (e) => {
     console.log('Global error:', e);
   });
   ```

2. **Verify Terminal Import**:
   ```javascript
   import { Terminal } from '@shelltender/client';
   console.log('Terminal component:', Terminal);
   console.log('Is ForwardRef?:', Terminal.$$typeof === Symbol.for('react.forward_ref'));
   ```

3. **Check React Version**:
   ```javascript
   console.log('React version:', React.version);
   console.log('React DOM version:', ReactDOM.version);
   ```

4. **Debug Ref Timing**:
   ```javascript
   const refHistory: string[] = [];
   
   <Terminal
     ref={(el) => {
       refHistory.push(`Ref called: ${el ? 'object' : 'null'}`);
       console.log('Ref history:', refHistory);
       console.trace('Ref callback stack');
     }}
   />
   ```

5. **Check Bundle**:
   Look in node_modules/@shelltender/client/dist/index.js for:
   - Search for `useImperativeHandle`
   - Search for `forwardRef`
   - Verify they exist in the bundled code

## Temporary Workarounds

### 1. Direct Terminal Access (Current Workaround)
```javascript
const xtermTextarea = containerRef.current?.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
if (xtermTextarea) {
  xtermTextarea.focus();
}
```

### 2. Custom Hook Wrapper
```javascript
function useTerminalRef() {
  const [terminal, setTerminal] = useState<TerminalHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!terminal && containerRef.current) {
      // Fallback: create mock handle
      const textarea = containerRef.current.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
      if (textarea) {
        setTerminal({
          focus: () => textarea.focus(),
          fit: () => console.warn('Fit not available in fallback mode')
        });
      }
    }
  }, [terminal]);
  
  return { terminal, containerRef };
}
```

### 3. Patch Terminal Component
```javascript
import { Terminal as OriginalTerminal } from '@shelltender/client';

const Terminal = forwardRef((props, ref) => {
  const internalRef = useRef();
  
  useEffect(() => {
    // Force ref callback
    if (ref && internalRef.current) {
      const handle = {
        focus: () => {
          const textarea = internalRef.current?.querySelector('.xterm-helper-textarea');
          textarea?.focus();
        },
        fit: () => {
          console.warn('Fit not implemented in patch');
        }
      };
      
      if (typeof ref === 'function') {
        ref(handle);
      } else {
        ref.current = handle;
      }
    }
  }, [ref]);
  
  return <div ref={internalRef}><OriginalTerminal {...props} /></div>;
});
```

## Next Steps

1. Need to test with React 19 specifically
2. Check if issue exists in development vs production builds
3. Verify the exact build output that's published to npm
4. Consider adding integration tests with different React versions

## Hypothesis

Most likely cause: React 19 compatibility issue with ref forwarding, possibly related to the timing of when `useImperativeHandle` is called or how `forwardRef` behaves in React 19.