import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
});
