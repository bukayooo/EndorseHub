import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import checker from "vite-plugin-checker";
import runtimeErrorPlugin from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    checker({ typescript: true, overlay: false }),
    runtimeErrorPlugin(),
  ] as any,
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443,
      host: '0.0.0.0'
    },
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying:', req.method, req.url, 'to', proxyReq.path);
          });
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "../db"),
    },
  }
});
