import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.base.config';

export default defineConfig({
  ...baseConfig,
  // Build the library entry plus the `shelltender` CLI (see package.json "bin").
  entry: ['src/index.ts', 'src/cli.ts'],
});
