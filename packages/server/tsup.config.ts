import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'patterns/index': 'src/patterns/index.ts'
  },
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
  platform: 'node',
  target: 'node18',
  external: [
    'node-pty',
    'ws',
    'express',
    'cors',
    'uuid',
    'minimist',
    '@shelltender/core'
  ],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    };
  },
  esbuildOptions(options) {
    options.packages = 'external';
  }
});