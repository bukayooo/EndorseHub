import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import checker from "vite-plugin-checker";
import runtimeErrorPlugin from "@replit/vite-plugin-runtime-error-modal";

// Determine if we're running in Replit
const isReplit = !!process.env.REPL_SLUG && !!process.env.REPL_OWNER;
const replitDomain = isReplit 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : 'http://localhost:80';

export default defineConfig({
  plugins: [
    react(),
    themePlugin(),
    checker({ typescript: true, overlay: false }),
    runtimeErrorPlugin()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: replitDomain,
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: replitDomain,
        changeOrigin: true,
        secure: false,
      },
      '/widgets': {
        target: replitDomain,
        changeOrigin: true,
        secure: false,
      },
      '/analytics': {
        target: replitDomain,
        changeOrigin: true,
        secure: false,
      },
      '/billing': {
        target: replitDomain,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
