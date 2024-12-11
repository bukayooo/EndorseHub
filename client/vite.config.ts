
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
    hmr: process.env.REPL_SLUG 
      ? {
          clientPort: 443,
          host: process.env.REPL_OWNER 
            ? `${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.repl.co`
            : undefined,
          protocol: "wss",
          path: "/@vite/client",
          timeout: 60000
        }
      : {
          port: 5173,
          protocol: "ws",
          host: true
        }
  },
  define: {
    'process.env.VITE_DEV_SERVER_URL': JSON.stringify(process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.repl.co`
      : 'http://localhost:5173')
  }
});
