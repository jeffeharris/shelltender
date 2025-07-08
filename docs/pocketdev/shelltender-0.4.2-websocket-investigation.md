# Shelltender v0.4.2 WebSocket Configuration Investigation

## User Report Summary

A user reported that v0.4.2 still has the WebSocket configuration bug:
- Terminal tries to connect to `ws://localhost:8081/` directly
- WebSocketProvider config with `url: '/shelltender-ws'` is ignored
- Terminal ref callback is never invoked

## Investigation Results

### 1. Code Changes Are Present

Verified that the v0.4.2 changes are in the source:
- Terminal.tsx imports and uses `useWebSocket` hook ✓
- Terminal no longer creates its own WebSocketService ✓
- The built output contains these changes ✓

### 2. Found Additional Issue: Relative URL Handling

The WebSocketService doesn't properly handle relative URLs like `/shelltender-ws`. When passed such a URL, it tries to create a WebSocket with just the path, which is invalid.

**Fix implemented:**
```typescript
constructor(config: WebSocketServiceConfig = {}) {
  if (config.url) {
    // Handle relative URLs by constructing full WebSocket URL
    if (config.url.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host; // includes port if present
      this.url = `${protocol}://${host}${config.url}`;
    } else {
      this.url = config.url;
    }
  }
  // ... rest of constructor
}
```

### 3. Terminal Ref Issue

The ref should still be set even if WebSocket is not available, as `useImperativeHandle` is called outside the effect that has the early return.

## Possible Explanations for User's Issue

1. **Caching/Build Issue**: The user might have an old cached version of the package
2. **NPM Registry Delay**: The published v0.4.2 might not have the actual fixes
3. **Import Issue**: They might be importing from a different location

## Recommendations for User

1. **Verify Installation**:
   ```bash
   npm list @shelltender/client
   # Should show 0.4.2
   
   # Force reinstall
   npm uninstall @shelltender/client
   npm install @shelltender/client@0.4.2
   ```

2. **Clear Build Cache**:
   ```bash
   rm -rf node_modules/.vite
   rm -rf .next  # if using Next.js
   ```

3. **Temporary Workaround** (until v0.4.3):
   Use a full WebSocket URL instead of relative:
   ```typescript
   const wsConfig = {
     url: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/shelltender-ws`
   };
   ```

4. **Debug the Import**:
   ```typescript
   import { Terminal } from '@shelltender/client';
   console.log('Terminal component:', Terminal);
   // Check if it's the right component
   ```

## What's Fixed in This Session

1. Added proper relative URL handling to WebSocketService
2. Added tests for the relative URL handling
3. Verified the original v0.4.2 fix is present in source

## Next Steps for v0.4.3

The relative URL handling fix needs to be included in v0.4.3 release.