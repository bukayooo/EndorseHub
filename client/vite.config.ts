import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Determine if we're running in Replit
const isReplit = !!process.env.REPL_SLUG;
const replitHost = `${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.repl.co`;

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
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false
      },
      "/embed": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false
      }
    },
    cors: true,
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: isReplit 
      ? {
          clientPort: 443,
          host: replitHost,
          protocol: "wss"
        }
      : true
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  }
});