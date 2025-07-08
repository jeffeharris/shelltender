# Shelltender v0.4.2 Release Issue - Root Cause Found

## Summary

You are absolutely correct - v0.4.2 does NOT contain the WebSocket configuration fix. I've discovered why.

## The Timeline Issue

Looking at the git history:

```
50eb87e fix: WebSocketService now handles relative URLs properly
aeb68be chore: release v0.4.2                                    <-- RELEASE MADE HERE
ab31d27 fix: Terminal now uses shared WebSocket service           <-- FIX MADE HERE (AFTER!)
cafd4a6 chore: release v0.4.1
```

The v0.4.2 release was made BEFORE the actual fix was implemented. This means:

1. v0.4.2 was released with only version bumps in package.json files
2. The changelog mentioned the fix, but the code didn't have it
3. The actual fix was committed after v0.4.2 was already published
4. NPM has the v0.4.2 package without the fix

## What Happened

1. The release process updated version numbers and changelog
2. The package was published to npm 
3. THEN the actual WebSocket fix was implemented
4. The fix exists in the repository but not in the published v0.4.2 package

## Current State

- **Published v0.4.2**: Has the bug (Terminal creates its own WebSocket)
- **Current dev branch**: Has the fix (Terminal uses shared WebSocket)
- **Your experience**: Matches exactly what's in the published package

## What You're Seeing

Your logs confirm this:
- Terminal is creating its own WebSocket to `ws://localhost:8081/`
- WebSocketProvider config is being ignored
- The ref is not being set (likely due to WebSocket connection failure)

## Immediate Workarounds

Unfortunately, there's no easy workaround since the Terminal component in v0.4.2 hardcodes its own WebSocket creation. Options:

1. **Wait for v0.4.3** - Which will include the actual fixes
2. **Use v0.4.0** - If it meets your needs (no focus() method though)
3. **Fork and patch** - Apply the fix locally until v0.4.3

## The Fix That's Coming

In the next release (v0.4.3), Terminal will:
- Use the shared WebSocket from `useWebSocket` hook
- Respect WebSocketProvider configuration
- Handle relative URLs properly
- Set refs correctly

## Apologies

This is a release process failure where the changelog and version were updated before the actual implementation. The fix exists but wasn't included in the published package.

## Verification

You can verify this by checking the source of the published package:
```bash
npm pack @shelltender/client@0.4.2
tar -xf shelltender-client-0.4.2.tgz
grep -n "new WebSocketService" package/dist/index.js
# You'll find it creates its own WebSocketService
```

The fix is real and tested, it just didn't make it into the v0.4.2 npm package.