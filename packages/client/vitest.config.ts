import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    css: true,
    setupFiles: './src/test-setup.ts',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});