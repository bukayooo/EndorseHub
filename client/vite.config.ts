import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Determine the API URL based on environment
const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Proxy] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Proxy] Sending Request:', req.method, req.url);
            // Don't override origin in production
            if (process.env.NODE_ENV !== 'production') {
              proxyReq.setHeader('origin', apiUrl);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[Proxy] Received Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios', '@tanstack/react-query']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@db': path.resolve(__dirname, '../db')
    }
  }
});
