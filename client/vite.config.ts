import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@db": path.resolve(__dirname, "../db"),
      "@components": path.resolve(__dirname, "src/components"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@lib": path.resolve(__dirname, "src/lib")
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      protocol: 'wss',
      clientPort: 443,
      path: 'ws',
      timeout: 5000,
      host: process.env.REPL_SLUG + '.id.repl.co'
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      "/api": {
        target: "http://0.0.0.0:5000",
        changeOrigin: true,
        secure: false,
        ws: true
      },
      "/embed": {
        target: "http://0.0.0.0:5000",
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  optimizeDeps: {
    force: true
  }
});
