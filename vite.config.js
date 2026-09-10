import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['exact-slashed-purchase.ngrok-free.dev'],
    proxy: {'/health': 'http://127.0.0.1:8000',
      '/analyze': 'http://127.0.0.1:8000',
      '/events': 'http://127.0.0.1:8000',
      '/emergencies': 'http://127.0.0.1:8000',
      '/sms': 'http://127.0.0.1:8000',
    },
  },
})