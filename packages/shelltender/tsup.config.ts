import { defineConfig } from 'tsup';

export default defineConfig({
  // `.` (combined), plus `./server` and `./client` subpaths so consumers can
  // pull only the side they need (server = node-pty; client = React) without
  // dragging in the other.
  entry: ['src/index.ts', 'src/server.ts', 'src/client.ts'],
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