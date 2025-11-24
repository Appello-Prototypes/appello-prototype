import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        // Copy _redirects file to dist during build
        const redirectsSource = join(__dirname, 'public', '_redirects')
        const redirectsDest = join(__dirname, 'dist', '_redirects')
        if (existsSync(redirectsSource)) {
          try {
            copyFileSync(redirectsSource, redirectsDest)
            console.log('✅ Copied _redirects to dist')
          } catch (error) {
            console.warn('⚠️  Could not copy _redirects:', error.message)
          }
        }
      },
    },
  ],
  publicDir: 'public',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  base: '/',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
})
