
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/entities': path.resolve(__dirname, './src/entities')
    }
  },
  server: {
    allowedHosts: 'all',
    port: 3010,
    open: true,
    proxy: {
      // Proxy API calls to the api-service so CORS is never an issue in dev.
      // The SDK initialises with endpoint: 'http://localhost:3000' but the
      // actual requests go through Vite and are forwarded here.
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})