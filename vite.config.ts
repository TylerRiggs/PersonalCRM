import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy OpenClaw OpenAI-compatible API to avoid CORS
      '/v1': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
      },
      // Proxy OpenClaw tools invoke API
      '/tools': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
      },
    },
  },
})
