
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import shadowedThemePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorPlugin from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [react(), shadowedThemePlugin(), runtimeErrorPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "../db"),
    },
  },
});
