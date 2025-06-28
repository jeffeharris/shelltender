import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    // Use tsc for better compatibility
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@shelltender/core'],
  noExternal: ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links', '@xterm/addon-unicode11'],
  platform: 'browser',
  target: 'es2020',
  loader: {
    '.css': 'empty'
  },
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"'
    };
    options.packages = 'external';
    options.resolveExtensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
  }
});