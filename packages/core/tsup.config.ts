import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    entry: './src/index.ts',
  },
  clean: true,
  target: 'es2020',
  external: [],
  noExternal: [],
  splitting: false,
  sourcemap: true,
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    };
  },
});