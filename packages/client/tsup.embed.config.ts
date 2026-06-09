import { defineConfig } from 'tsup';

/**
 * Builds the framework-agnostic embeddable terminal (src/embed.ts) two ways:
 *   1. ESM + CJS for `@shelltender/client/embed` (bundlers resolve xterm).
 *   2. A self-contained IIFE global (`window.Shelltender`) with xterm bundled
 *      in, for use via a plain <script> tag (e.g. the server's /terminal page).
 * Kept separate from the main tsup config so it doesn't disturb the React build.
 */
export default defineConfig([
  {
    entry: { embed: 'src/embed.ts' },
    format: ['esm', 'cjs'],
    dts: false,
    sourcemap: true,
    target: 'es2020',
    tsconfig: './tsconfig.json',
    external: ['react', 'react-dom'],
    clean: false,
  },
  {
    // IIFE output is named "<entry>.global.js", so the entry key is `embed`.
    entry: { embed: 'src/embed.ts' },
    format: ['iife'],
    globalName: 'Shelltender',
    dts: false,
    sourcemap: false,
    target: 'es2020',
    tsconfig: './tsconfig.json',
    noExternal: [/.*/], // bundle everything (xterm) for a drop-in <script>
    minify: true,
    clean: false,
  },
]);
