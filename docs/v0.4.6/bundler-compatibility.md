# Bundler Compatibility Guide for @shelltender/client

## Overview

The `@shelltender/client` package is designed to work with modern JavaScript bundlers. This guide covers compatibility considerations and troubleshooting tips for common bundlers.

## Terminal Component and React forwardRef

### The Issue

The Terminal component uses React's `forwardRef` to expose imperative methods (`focus()` and `fit()`). Some bundlers may strip this wrapper during optimization, causing refs to be `null`.

### The Solution (v0.4.5+)

We've added the `@__PURE__` annotation to preserve the forwardRef wrapper:

```typescript
export const Terminal = /* @__PURE__ */ forwardRef<TerminalHandle, TerminalProps>(TerminalComponent);
```

## Bundler-Specific Configuration

### Vite

Vite generally works out of the box with Shelltender. If you experience issues:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    // Option 1: Include for pre-bundling (recommended)
    include: ['@shelltender/client']
    
    // Option 2: Exclude from optimization if having issues
    // exclude: ['@shelltender/client']
  }
});
```

### Webpack

Webpack should work without special configuration. If tree-shaking causes issues:

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    sideEffects: true, // Respect package.json sideEffects field
    usedExports: true
  }
};
```

### Parcel

Parcel works out of the box. No special configuration needed.

### Rollup

If using Rollup directly:

```javascript
// rollup.config.js
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  plugins: [
    nodeResolve(),
    commonjs()
  ],
  external: ['react', 'react-dom']
};
```

### esbuild

When using esbuild directly:

```javascript
// build.js
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  format: 'esm',
  // Preserve important annotations
  keepNames: true,
  treeShaking: true
});
```

## Common Issues and Solutions

### Issue: Terminal ref is null

**Symptoms:**
```typescript
const terminalRef = useRef<TerminalHandle>(null);
// terminalRef.current is always null
```

**Solutions:**

1. **Update to v0.4.5+** - This version includes the forwardRef fix

2. **Verify the build** - Run the validation script:
   ```bash
   npm run verify:build
   ```

3. **Check bundler output** - Look for the @__PURE__ annotation:
   ```javascript
   // Good - annotation preserved
   const Terminal = /* @__PURE__ */ forwardRef(...)
   
   // Bad - annotation stripped
   const Terminal = forwardRef(...)
   ```

### Issue: TypeScript types not recognized

**Symptoms:**
- `TerminalHandle` type not found
- Terminal ref methods not showing in autocomplete

**Solutions:**

1. **Check TypeScript configuration:**
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "bundler", // or "node"
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true
     }
   }
   ```

2. **Ensure types are imported:**
   ```typescript
   import { Terminal, type TerminalHandle } from '@shelltender/client';
   ```

### Issue: Module resolution errors

**Symptoms:**
- Cannot find module '@shelltender/client'
- ESM/CJS compatibility errors

**Solutions:**

1. **Check package.json type field:**
   ```json
   {
     "type": "module" // for ESM projects
   }
   ```

2. **Use appropriate import syntax:**
   ```typescript
   // ESM
   import { Terminal } from '@shelltender/client';
   
   // CommonJS
   const { Terminal } = require('@shelltender/client');
   ```

## Build Validation

We provide a build validation script to ensure critical features are preserved:

```bash
# Run after building your app
npx @shelltender/client verify-build
```

This checks for:
- ✓ @__PURE__ annotation on forwardRef
- ✓ Terminal.displayName preservation
- ✓ useImperativeHandle hook presence
- ✓ TypeScript declarations

## Workarounds for Older Versions

If you cannot upgrade to v0.4.5+, here are some workarounds:

### 1. Exclude from optimization

**Vite:**
```typescript
optimizeDeps: {
  exclude: ['@shelltender/client']
}
```

**Webpack:**
```javascript
module: {
  rules: [{
    test: /node_modules\/@shelltender\/client/,
    sideEffects: true
  }]
}
```

### 2. Direct DOM access fallback

```typescript
const focusTerminal = () => {
  const textarea = containerRef.current?.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
  textarea?.focus();
};
```

### 3. Custom wrapper component

```typescript
const TerminalWrapper = forwardRef((props, ref) => {
  const internalRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(ref, () => ({
    focus: () => {
      const textarea = internalRef.current?.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
      textarea?.focus();
    },
    fit: () => {
      console.warn('Fit method requires proper ref forwarding');
    }
  }));
  
  return <div ref={internalRef}><Terminal {...props} /></div>;
});
```

## Testing Your Bundle

To verify your bundled application works correctly:

```typescript
// test-terminal-ref.tsx
import { useRef, useEffect } from 'react';
import { Terminal, type TerminalHandle } from '@shelltender/client';

function TestComponent() {
  const terminalRef = useRef<TerminalHandle>(null);
  
  useEffect(() => {
    // This should log the ref object, not null
    console.log('Terminal ref:', terminalRef.current);
    
    // Test methods
    if (terminalRef.current) {
      console.log('✓ Ref is available');
      terminalRef.current.focus();
      terminalRef.current.fit();
    } else {
      console.error('✗ Ref is null');
    }
  }, []);
  
  return <Terminal ref={terminalRef} />;
}
```

## Performance Considerations

### Bundle Size

The @shelltender/client package includes:
- xterm.js and addons (~350KB minified)
- React components (~50KB minified)
- WebSocket service (~10KB minified)

To optimize bundle size:

1. **Use code splitting:**
   ```typescript
   const Terminal = lazy(() => import('@shelltender/client').then(m => ({ default: m.Terminal })));
   ```

2. **Tree shake unused exports:**
   ```typescript
   // Only import what you need
   import { Terminal } from '@shelltender/client';
   // Not: import * as Shelltender from '@shelltender/client';
   ```

## Need Help?

If you encounter bundler-specific issues:

1. Check the [troubleshooting guide](https://github.com/jeffh/shelltender/blob/main/docs/troubleshooting.md)
2. Run the build validation script
3. Open an issue with:
   - Bundler name and version
   - Build configuration
   - Error messages
   - Output of `npm run verify:build`