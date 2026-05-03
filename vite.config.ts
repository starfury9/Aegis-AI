import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiDevProxy = {
  '/api': {
    target: 'http://localhost:8787',
    changeOrigin: true,
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: apiDevProxy,
  },
  preview: {
    proxy: apiDevProxy,
  },
})
