import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  css: {
    devSourcemap: false
  },
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true, 
    open: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      overlay: true,
      timeout: 3000,
    },
  },
  proxy: {
    '/api': {
      target: 'https://vidhelp-backend.up.railway.app',
      changeOrigin: true
    }
  }
})