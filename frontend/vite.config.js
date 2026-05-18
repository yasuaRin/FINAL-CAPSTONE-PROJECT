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
      interval: 100,
    },
    hmr: {
      overlay: true,
    },
  },
  // proxy: {
  //   '/api': {
  //     target: 'http://localhost:5000',
  //     changeOrigin: true
  //   }
  // }
})