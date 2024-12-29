import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { PluginOption } from 'vite';

export default defineConfig({
  plugins: [react() as PluginOption],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
