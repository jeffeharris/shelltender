import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
  },
  ssr: {
    noExternal: ['@shelltender/client']
  },
  server: {
    port: 3000,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8085',
        ws: true,
        changeOrigin: true,
      },
      '/api': 'http://localhost:8085'
    }
  }
});