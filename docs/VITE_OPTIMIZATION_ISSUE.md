# Vite Optimization and Terminal Ref Issue

## Problem

The Terminal component's `ref` might not work due to bundler optimizations. This is a known issue with esbuild (used by Vite and tsup) not preserving React's `forwardRef` wrapper during bundling.

## Symptoms

- Terminal ref callback is never called
- `terminalRef.current` remains `null`
- Console shows: `Terminal.$$typeof: undefined`

## Solution for Users

Add this to your `vite.config.ts`:

```typescript
export default defineConfig({
  optimizeDeps: {
    exclude: ['@shelltender/client']
  }
})
```

This prevents Vite from pre-bundling Shelltender, preserving the `forwardRef` wrapper.

## Alternative: Use the DOM Fallback

If you can't modify Vite config, use the DOM selection workaround:

```typescript
const focusTerminal = () => {
  const textarea = containerRef.current?.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
  textarea?.focus();
};
```

## Why This Happens

Vite's dependency pre-bundling optimizes React components by:
- Inlining component functions
- Removing "unnecessary" wrappers
- Converting module formats

This can strip React's `forwardRef` wrapper, making the component lose its ref forwarding capability.

## Fixed in v0.4.5

Version 0.4.5 adds `@__PURE__` annotation to preserve `forwardRef` during bundling.

## Technical Details

This is a known esbuild issue (https://github.com/evanw/esbuild/issues/2749) where `React.forwardRef` is not automatically annotated as side-effect-free, preventing proper tree-shaking and sometimes causing the forwardRef wrapper to be optimized away.