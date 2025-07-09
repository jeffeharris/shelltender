import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shelltender/client': path.resolve(__dirname, '../../packages/client/src'),
      '@shelltender/core': path.resolve(__dirname, '../../packages/core/src'),
      '@shelltender/server': path.resolve(__dirname, '../../packages/server/src')
    }
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '5174'),
    proxy: {
      '/api': 'http://localhost:3000'
    },
    // Show network URL in console
    open: false,
    strictPort: true,
    // Disable host check for cloudflare/ngrok tunnels
    hmr: {
      overlay: false
    }
  }
})
