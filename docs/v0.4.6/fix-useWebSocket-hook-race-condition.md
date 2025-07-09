# Fix useWebSocket Hook Race Condition - Shelltender v0.4.6

**Created**: 2025-07-09  
**Type**: Implementation Guide  
**For**: Claude  
**Priority**: HIGH - Breaking bug affecting all Terminal components  

## Claude Must NEVER
- Modify the hook without first reading the entire file
- Change the shared WebSocket singleton pattern
- Break backward compatibility with existing code
- Remove the connection counting logic
- Initialize multiple WebSocket instances

## Problem Statement
The `useWebSocket` hook returns `null` for `wsService` on first render because initialization happens in `useEffect` (after render). This causes Terminal components to fail with "WebSocket service not available".

## State Tracking
```typescript
const fixState = {
  CURRENT_STEP: 0,
  TOTAL_STEPS: 5,
  FILES_TO_MODIFY: [
    "/packages/client/src/hooks/useWebSocket.ts"
  ],
  TESTS_TO_RUN: [
    "npm test -w @shelltender/client",
    "npm run typecheck"
  ],
  BREAKING_CHANGES: false,
  ROLLBACK_COMMIT: "" // Set after initial commit
};
```

## Pre-execution Checklist
```bash
# Run all checks in parallel
cd /home/jeffh/projects/shelltender && \
git status --porcelain | grep -q . && echo "FAIL: Uncommitted changes" || echo "PASS: Clean working directory" & \
npm test -w @shelltender/client > /tmp/test-before.log 2>&1 && echo "PASS: Tests passing" || echo "FAIL: Tests failing" & \
grep -n "wsServiceRef.current = sharedWsService" packages/client/src/hooks/useWebSocket.ts && echo "PASS: Hook file found" || echo "FAIL: Hook file missing" & \
wait
```

## Decision Framework
```
Hook initialization timing issue
├─ Is wsService null on first render?
│  └─ YES → Apply synchronous initialization fix
├─ Are there uncommitted changes?
│  └─ YES → STOP and ask user to commit or stash
├─ Do existing tests pass?
│  └─ NO → STOP and fix tests first
└─ Otherwise → Proceed with implementation
```

## Implementation Steps

### Step 1: Create Backup Branch
```bash
cd /home/jeffh/projects/shelltender
git checkout -b fix/v0.4.6-usewebsocket-race-condition
echo "ROLLBACK_COMMIT=$(git rev-parse HEAD)" >> /tmp/fix-state.sh
```

### Step 2: Read and Analyze Current Hook
```bash
# First read the file to understand current implementation
cat packages/client/src/hooks/useWebSocket.ts
```

### Step 3: Apply the Fix

The fix moves WebSocket initialization outside useEffect to ensure it's available on first render:

```typescript
// EXACT REPLACEMENT for useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { WebSocketService, WebSocketServiceConfig } from '../services/WebSocketService.js';
import { useWebSocketConfig } from '../context/WebSocketContext.js';

let sharedWsService: WebSocketService | null = null;
let connectionCount = 0;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { config } = useWebSocketConfig();
  
  // Initialize WebSocket service synchronously on first call
  if (!sharedWsService) {
    sharedWsService = new WebSocketService(config);
    sharedWsService.connect();
  }
  
  // Use ref to provide stable reference
  const wsServiceRef = useRef<WebSocketService>(sharedWsService);

  useEffect(() => {
    connectionCount++;
    
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    sharedWsService!.onConnect(handleConnect);
    sharedWsService!.onDisconnect(handleDisconnect);

    // Check initial connection state
    setIsConnected(sharedWsService!.isConnected());

    return () => {
      connectionCount--;
      
      // Only disconnect if no other components are using it
      if (connectionCount === 0 && sharedWsService) {
        sharedWsService.disconnect();
        sharedWsService = null;
      }
    };
  }, []);

  return {
    wsService: wsServiceRef.current,
    isConnected
  };
}
```

### Step 4: Test the Fix
```bash
# Run tests in parallel for speed
cd /home/jeffh/projects/shelltender && \
npm test -w @shelltender/client -- --run > /tmp/test-after.log 2>&1 & \
npm run typecheck -w @shelltender/client > /tmp/typecheck.log 2>&1 & \
npm run lint -w @shelltender/client > /tmp/lint.log 2>&1 & \
wait

# Check results
grep -q "failed" /tmp/test-after.log && echo "TESTS FAILED" || echo "TESTS PASSED"
grep -q "error" /tmp/typecheck.log && echo "TYPECHECK FAILED" || echo "TYPECHECK PASSED"
```

### Step 5: Build and Verify
```bash
# Build the client package
npm run build -w @shelltender/client

# Verify the Terminal component now works
cd apps/demo && npm run dev
# Terminal should now render without "WebSocket service not available" error
```

## Verification Checklist
```bash
# All checks must pass
echo "=== VERIFICATION ==="
grep -q "wsService: wsServiceRef.current," packages/client/src/hooks/useWebSocket.ts && echo "✓ Hook returns ref.current" || echo "✗ Hook not updated"
grep -q "if (!sharedWsService)" packages/client/src/hooks/useWebSocket.ts | head -1 | grep -v "useEffect" && echo "✓ Init outside useEffect" || echo "✗ Init still in useEffect"
ls packages/client/dist/hooks/useWebSocket.js 2>/dev/null && echo "✓ Build successful" || echo "✗ Build failed"
```

## Error Recovery Procedures

### If Tests Fail
```bash
# Compare test output
diff /tmp/test-before.log /tmp/test-after.log

# Revert to original
git checkout packages/client/src/hooks/useWebSocket.ts

# Try alternative implementation (initialize in module scope)
```

### If Build Fails
```bash
# Check for syntax errors
npx tsc --noEmit packages/client/src/hooks/useWebSocket.ts

# Clear build cache
rm -rf packages/client/dist
npm run build -w @shelltender/client
```

### If Terminal Still Doesn't Work
```bash
# Debug with logging
# Add console.log to hook to verify initialization
echo 'console.log("[useWebSocket] wsService:", !!wsServiceRef.current);' >> packages/client/src/hooks/useWebSocket.ts

# Check browser console for errors
# Verify WebSocket URL is correct in Network tab
```

## Complete Rollback
```bash
# If anything goes wrong
source /tmp/fix-state.sh
git checkout $ROLLBACK_COMMIT
git branch -D fix/v0.4.6-usewebsocket-race-condition
```

## Success Criteria
- [ ] Terminal component renders without "WebSocket service not available" error
- [ ] WebSocket connection establishes on first render
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] Connection counting still works correctly
- [ ] Only one WebSocket instance created

## Post-Implementation
```bash
# Commit the fix
git add packages/client/src/hooks/useWebSocket.ts
git commit -m "fix: initialize WebSocket service synchronously to prevent race condition

- Move WebSocket initialization outside useEffect
- Ensures wsService is available on first render
- Fixes Terminal component initialization error
- Maintains singleton pattern and connection counting"

# Update version
npm version patch -w @shelltender/client
```

## Integration Test
Create this test file to verify the fix:

```typescript
// packages/client/src/hooks/__tests__/useWebSocket.race.test.ts
import { renderHook } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

test('wsService is available on first render', () => {
  const { result } = renderHook(() => useWebSocket());
  
  // Should not be null on first render
  expect(result.current.wsService).not.toBeNull();
  expect(result.current.wsService).toBeDefined();
});
```

## Notes for Maintainers
- This fix ensures the WebSocket service is available synchronously
- The singleton pattern is preserved
- Connection counting prevents premature disconnection
- The fix is backward compatible with all existing usage