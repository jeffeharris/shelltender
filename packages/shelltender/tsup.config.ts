import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2020',
  external: [
    '@shelltender/core',
    '@shelltender/server', 
    '@shelltender/client',
    'express',
    'ws',
    'node-pty'
  ],
  noExternal: [],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    };
  },
});