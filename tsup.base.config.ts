import type { Options } from 'tsup';

/**
 * Shared tsup configuration for @shelltender packages.
 * Import and spread this in each package's tsup.config.ts
 */
export const baseConfig: Options = {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  tsconfig: './tsconfig.json',
};
