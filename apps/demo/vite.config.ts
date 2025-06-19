import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
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
