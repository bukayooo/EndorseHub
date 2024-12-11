import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    })
  ],
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
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        ws: true
      },
      "/embed": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      }
    },
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443,
      host: '0.0.0.0'
    }
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1000
  }
});
