# TypeScript Build Issues - Fix Instructions

## ✅ UPDATE: Build Issues Resolved!

The TypeScript build issues have been successfully resolved. The key fixes were:

1. **Added `rm -f tsconfig.tsbuildinfo` to all build scripts** - The incremental build cache was preventing type declaration generation
2. **Excluded test files from TypeScript compilation** - Added `**/*.test.tsx` to exclude patterns
3. **Disabled DTS generation in tsup** - Set `dts: false` in tsup.config.ts files
4. **Used `tsc --emitDeclarationOnly` for type generation** - More reliable than tsup's built-in DTS

All packages now build successfully with: `npm run build:packages`

---

## Original Fix Instructions

## Problem Summary
The monorepo has TypeScript configuration inconsistencies causing build failures:
1. Core package fails to generate type declarations (`.d.ts` files)
2. Client/Server packages can't find core's type declarations
3. Inconsistent module resolution strategies across packages

## Step-by-Step Fix Instructions

### 1. Fix Core Package (`packages/core/tsconfig.json`)

Replace the current tsconfig.json with:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### 2. Fix Client Package (`packages/client/tsconfig.json`)

Update to include project references:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
  "references": [
    { "path": "../core" }
  ]
}
```

### 3. Fix Server Package (`packages/server/tsconfig.json`)

Ensure consistency:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
  "references": [
    { "path": "../core" }
  ]
}
```

### 4. Update tsup Configuration

For all packages, update `tsup.config.ts` to handle ESM modules better:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    entry: './src/index.ts',
  },
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
  tsconfig: './tsconfig.json',
});
```

### 5. Build Order Script

Add to root `package.json` scripts:
```json
{
  "scripts": {
    "build:packages": "npm run build:core && npm run build:server && npm run build:client",
    "build:core": "npm run build -w @shelltender/core",
    "build:server": "npm run build -w @shelltender/server", 
    "build:client": "npm run build -w @shelltender/client"
  }
}
```

### 6. Testing the Fix

1. Clean all build artifacts:
   ```bash
   npm run clean
   rm -rf packages/*/dist
   rm -rf packages/*/node_modules/.cache
   ```

2. Reinstall dependencies:
   ```bash
   npm install
   ```

3. Build packages in order:
   ```bash
   npm run build:packages
   ```

### 7. Temporary Workaround (if needed)

If tsup continues to have issues with DTS generation, temporarily disable it and use tsc directly:

In each package's `package.json`:
```json
{
  "scripts": {
    "build": "tsup && tsc --emitDeclarationOnly",
    "build:js": "tsup --no-dts",
    "build:types": "tsc --emitDeclarationOnly"
  }
}
```

### 8. Long-term Solution

Consider migrating to a more robust build tool for monorepos:
- **Turborepo**: Better caching and parallel builds
- **Nx**: Comprehensive monorepo tooling
- **Vite Library Mode**: For building the packages

## Verification

After implementing these fixes, verify:
1. `npm run build -w @shelltender/core` completes successfully
2. Check that `packages/core/dist/index.d.ts` exists
3. `npm run build -w @shelltender/client` completes successfully
4. `npm run typecheck` passes in the root directory

## Notes
- The key issue is ensuring consistent module resolution across all packages
- The core package must build successfully first as others depend on it
- Using `"moduleResolution": "bundler"` with `"module": "ESNext"` provides the best compatibility for modern tooling