import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react()
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
      "/api": "http://0.0.0.0:5000",
      "/embed": "http://0.0.0.0:5000"
    },
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  },
  build: {
    sourcemap: true
  }
});
