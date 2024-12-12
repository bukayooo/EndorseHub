import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from "express";
import { createServer } from "http";
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from "fs";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} [server] ${message}`);
}

const app = express();

// Basic error handler
const errorHandler = (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log(`Error: ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: err.message });
};

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
registerRoutes(app);

const isDev = process.env.NODE_ENV === "development";
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (isDev) {
  log("Setting up development server with proxy to Vite...");
  
  // Setup proxy middleware
  const proxy = createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
    logLevel: 'silent',
    onError: (err, _req, res) => {
      log(`Proxy error: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: Frontend server not running');
    }
  });

  // Use proxy for non-API routes
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      return next();
    }
    proxy(req, res, next);
  });
} else {
  log("Setting up production server...");
  const distPath = path.resolve(__dirname, "../dist/public");
  
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    log(`Warning: Build directory not found at ${distPath}`);
  }
}

// Add error handling middleware last
app.use(errorHandler);

// Create and start server
const server = createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  log(`Server running in ${isDev ? 'development' : 'production'} mode`);
  log(`API Server listening on http://0.0.0.0:${PORT}`);
  if (isDev) {
    log(`Frontend Dev Server expected on http://localhost:5173`);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  log(`Uncaught Exception: ${err.message}`);
  console.error(err);
  process.exit(1);
});