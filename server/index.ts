import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createProxyMiddleware, type Filter } from "http-proxy-middleware";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isDev = process.env.NODE_ENV !== "production";

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
registerRoutes(app);

// Handle static files and proxy in development
if (isDev) {
  // Proxy all non-API requests to Vite dev server
  app.use(
    createProxyMiddleware({
      target: 'http://localhost:5173',
      changeOrigin: true,
      ws: true,
      pathFilter: '/api'
    })
  );
} else {
  // Serve static files in production
  const distPath = path.resolve(__dirname, "../dist/public");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = 3000;
const server = createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Running on port ${PORT} (${isDev ? "development" : "production"} mode)`);
});
