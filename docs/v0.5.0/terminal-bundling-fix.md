# Terminal Component Bundling Fix Documentation

## Issue Overview

The @shelltender/client Terminal component experiences issues with React's `forwardRef` being stripped or not properly preserved by modern bundlers (esbuild, Vite, tsup). This causes the ref callback to never be invoked, preventing access to the `focus()` and `fit()` methods.

## Current Implementation Analysis

### Component Structure
The Terminal component is implemented as a ForwardRef component in `packages/client/src/components/Terminal/Terminal.tsx`:

```typescript
// Component definition
const TerminalComponent = (props: TerminalProps, ref: React.ForwardedRef<TerminalHandle>) => {
  // Implementation using useImperativeHandle
  useImperativeHandle(ref, () => ({
    fit: performFit,
    focus: performFocus,
  }), [performFit, performFocus]);
  
  // ... rest of component
};

// Export with @__PURE__ annotation (added in v0.4.5)
export const Terminal = /* @__PURE__ */ forwardRef<TerminalHandle, TerminalProps>(TerminalComponent);
Terminal.displayName = 'Terminal';
```

### Export Chain
1. `Terminal.tsx` exports the forwardRef component directly
2. `index.ts` re-exports to preserve the forwardRef wrapper
3. Main package `index.ts` exports directly from source file (changed in v0.4.5)

## Root Cause of Bundling Issues

### 1. Esbuild Limitation
Esbuild does not automatically annotate `React.forwardRef` as side-effect-free. This is a known issue ([esbuild#2749](https://github.com/evanw/esbuild/issues/2749)) where:
- JSX calls are marked as `/* @__PURE__ */` automatically
- `React.forwardRef`, `React.memo`, and other React wrapper functions are NOT marked as pure
- Without the pure annotation, bundlers may strip the forwardRef wrapper during optimization

### 2. Tree Shaking Behavior
When bundlers perform tree shaking:
- Functions marked as pure can be removed if unused
- Functions without pure annotations are assumed to have side effects
- The forwardRef wrapper might be eliminated if the bundler doesn't recognize it as necessary

### 3. Vite Pre-bundling
Vite's dependency pre-bundling (using esbuild) can:
- Inline component functions
- Remove "unnecessary" wrappers
- Convert module formats
- Strip the forwardRef wrapper if not properly annotated

## Applied Fix (v0.4.5)

### @__PURE__ Annotation
Added explicit pure annotation to the forwardRef call:
```typescript
export const Terminal = /* @__PURE__ */ forwardRef<TerminalHandle, TerminalProps>(TerminalComponent);
```

This tells bundlers that the forwardRef call:
- Has no side effects
- Can be safely tree-shaken if unused
- Should be preserved when the component is used

### Simplified Export Chain
Changed from:
```typescript
// Terminal/index.ts exports
export { Terminal } from './Terminal.js';

// Main index.ts imports from index
export { Terminal } from './components/Terminal/index.js';
```

To:
```typescript
// Main index.ts imports directly from source
export { Terminal } from './components/Terminal/Terminal.js';
```

This reduces re-export layers that might interfere with bundler optimizations.

## Testing Strategy for Different Bundlers

### 1. Vite Testing
```typescript
// vite.config.ts - Test with and without optimization
export default defineConfig({
  // Test 1: With pre-bundling (default)
  optimizeDeps: {
    include: ['@shelltender/client']
  },
  
  // Test 2: Without pre-bundling
  optimizeDeps: {
    exclude: ['@shelltender/client']
  }
});
```

### 2. Webpack Testing
```javascript
// webpack.config.js
module.exports = {
  optimization: {
    sideEffects: false, // Test with aggressive tree shaking
    usedExports: true
  }
};
```

### 3. Esbuild Testing
```javascript
// Direct esbuild test
import { build } from 'esbuild';

await build({
  entryPoints: ['app.tsx'],
  bundle: true,
  treeShaking: true,
  format: 'esm',
  metafile: true // Analyze what gets included
});
```

### 4. Verification Script
```typescript
// verify-ref.tsx
import React, { useRef, useEffect } from 'react';
import { Terminal } from '@shelltender/client';

function TestApp() {
  const terminalRef = useRef<TerminalHandle>(null);
  
  useEffect(() => {
    console.log('Terminal ref:', terminalRef.current);
    console.log('Terminal.$$typeof:', Terminal.$$typeof);
    console.log('Is ForwardRef?:', Terminal.$$typeof === Symbol.for('react.forward_ref'));
  }, []);
  
  return (
    <Terminal 
      ref={(el) => {
        console.log('Ref callback called with:', el);
        terminalRef.current = el;
      }}
    />
  );
}
```

## Additional Bundler Considerations

### 1. Package.json sideEffects
Consider adding to package.json:
```json
{
  "sideEffects": false
}
```
This tells bundlers the entire package is side-effect-free and safe to tree-shake.

### 2. TypeScript Preservation
Ensure TypeScript doesn't strip annotations:
```json
{
  "compilerOptions": {
    "removeComments": false,
    "preserveConstEnums": true
  }
}
```

### 3. Build Output Validation
Add a post-build script to verify forwardRef preservation:
```javascript
// scripts/verify-build.js
const fs = require('fs');
const content = fs.readFileSync('dist/index.js', 'utf-8');

if (!content.includes('/* @__PURE__ */ forwardRef')) {
  throw new Error('Pure annotation missing from forwardRef!');
}

if (!content.includes('Terminal.displayName')) {
  throw new Error('Terminal displayName missing!');
}
```

## Known Workarounds for Users

### 1. Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@shelltender/client']
  }
});
```

### 2. Direct DOM Access Fallback
```typescript
const focusTerminal = () => {
  const textarea = containerRef.current?.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
  textarea?.focus();
};
```

### 3. Custom Wrapper Component
```typescript
const TerminalWithFallback = forwardRef((props, ref) => {
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

## Future Improvements

### 1. Automated Testing
- Add integration tests with different bundlers
- Test with various React versions (18, 19)
- Verify ref functionality in production builds

### 2. Build Process Enhancement
- Consider using Rollup with better React plugin support
- Add babel-plugin-transform-react-pure-annotations
- Implement custom esbuild plugin for automatic pure annotations

### 3. Documentation
- Add bundler compatibility matrix
- Document known working configurations
- Provide troubleshooting guide

## References

- [esbuild issue #2749: React.forwardRef not annotated as PURE](https://github.com/evanw/esbuild/issues/2749)
- [esbuild issue #3492: Tree shaking with memo/forwardRef](https://github.com/evanw/esbuild/issues/3492)
- [Vite React plugin issue #10: Missing PURE annotations](https://github.com/vitejs/vite-plugin-react/issues/10)
- [Babel plugin for React pure annotations](https://babeljs.io/docs/babel-plugin-transform-react-pure-annotations)

## Conclusion

The v0.4.5 fix addresses the immediate issue by adding `@__PURE__` annotation to preserve the forwardRef wrapper during bundling. However, this is part of a larger ecosystem issue where bundlers need better understanding of React's patterns. Users experiencing issues should first try excluding the package from optimization, then fall back to the DOM-based workarounds if needed.