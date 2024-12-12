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
      clientPort: 443,
      host: process.env.REPL_SLUG + '.id.repl.co'
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      },
      "/embed": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    force: true
  }
});
