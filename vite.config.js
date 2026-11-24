import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(async ({ command }) => ({
  plugins: [react(), ...(command === 'serve' ? [(await import('./scripts/local-api.mjs')).localApi()] : [])],
  server: { host: '127.0.0.1', fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/private-data/**', '**/.vercel/**'] } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}))
