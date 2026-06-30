import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The `server.proxy` block only affects local `vite` dev — it forwards
// /api/* to a running `vercel dev` (which serves the serverless functions),
// so the frontend and API work together locally. Ignored in production builds.
export default defineConfig({
  plugins: [react()],
  server: {
    // Pinned so the local OAuth redirect URI is stable — register
    // http://localhost:5173/api/oauth in the Google OAuth client once.
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3210',
    },
  },
})
