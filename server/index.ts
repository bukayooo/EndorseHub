import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isDev = process.env.NODE_ENV !== "production";

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

registerRoutes(app);

if (isDev) {
  console.log("[Server] Development mode: Setting up Vite");
  const server = createServer(app);
  await setupVite(app, server);
  server.listen(3000, () => {
    console.log("[Server] Development server running on port 3000");
  });
} else {
  console.log("[Server] Production mode: Serving static files");
  serveStatic(app);
  app.listen(3000, () => {
    console.log("[Server] Production server running on port 3000");
  });
}
