# Demo App - Next Steps

## Current Status

The demo app has been experiencing stability issues due to too many features running simultaneously. We've implemented a solution to separate features into distinct demo modes.

### Completed Work

1. **Fixed Terminal Race Condition**
   - Issue: Input was being sent before session ID was received
   - Solution: Added `isReadyRef` to block input until session is ready
   - Status: ✅ Confirmed working

2. **Fixed Pattern Library Checkboxes**
   - Issue: RegExp objects couldn't be JSON serialized
   - Solution: Convert RegExp to string before sending to server
   - Made UI sections collapsible
   - Status: ✅ Fixed

3. **Created Demo Mode Separation**
   - Created `AppRouter.tsx` to isolate features
   - Implemented demo modes: terminal, events, claude, mobile, diagnostics
   - Created `ClaudeAgentDemo.tsx` to demonstrate Claude AI patterns
   - Status: ✅ Implementation complete

## Next Steps to Complete

### 1. Test Each Demo Mode (Priority: High)
Run the demo app and test each mode individually:

```bash
# Terminal only mode
http://localhost:5173/?mode=terminal

# Event system mode  
http://localhost:5173/?mode=events

# Claude patterns mode
http://localhost:5173/?mode=claude

# Mobile view mode
http://localhost:5173/?mode=mobile

# Diagnostics mode
http://localhost:5173/?mode=diagnostics
```

### 2. Verify Core Stability (Priority: High)
- Start with terminal-only mode to ensure basic functionality works
- Test that sessions don't crash when typing
- Verify WebSocket connections remain stable
- Check that session creation/destruction works properly

### 3. Gradually Add Features (Priority: Medium)
Once core terminal is stable:
- Test event system in isolation
- Verify Claude pattern detection works
- Check mobile view responsiveness
- Ensure diagnostics provide useful information

### 4. Performance Optimization (Priority: Medium)
- Address the build warning about chunk size (582KB)
- Consider code splitting for better performance
- Lazy load demo-specific components

### 5. Documentation Updates (Priority: Low)
- Update README with new demo mode instructions
- Document each pattern in the Claude demo
- Add troubleshooting guide for common issues

## How to Run

1. Start the backend server (from project root):
   ```bash
   npm run dev
   ```

2. In another terminal, start the demo app:
   ```bash
   cd apps/demo
   npm run dev:client
   ```

3. Open http://localhost:5173 and use the mode selector or URL params

## Key Insights

The root cause of instability was feature interference. By isolating features:
- Each demo mode runs independently
- Features can't interfere with each other
- Easier to debug specific functionality
- Better performance with less overhead

## Testing Checklist

- [ ] Terminal mode: Can create sessions and type without crashes
- [ ] Event mode: Pattern library checkboxes work, patterns are detected
- [ ] Claude mode: Sequences play correctly, output appears in terminal
- [ ] Mobile mode: Touch gestures work, virtual keyboard functions
- [ ] Diagnostics mode: Shows useful debugging information