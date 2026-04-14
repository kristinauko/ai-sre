import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward ConnectRPC calls to the Go backend during development.
      '/sre.v1.SREService': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
  },
})
