import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from "express";
import { createServer } from "http";
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from "fs";
import { registerRoutes } from "./routes";
import { Request, Response, NextFunction } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} [server] ${message}`);
}
// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  log(`Error: ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: err.message });
};

const app = express();

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
registerRoutes(app);

const isDev = process.env.NODE_ENV === "development";
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

log(`Starting server in ${isDev ? 'development' : 'production'} mode...`);
log(`Using port: ${PORT}`);

if (isDev) {
  log("Setting up development server with proxy to Vite...");
  
  // Setup proxy middleware to forward non-API requests to Vite
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api')) {
      next();
    } else {
      createProxyMiddleware({ 
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true
      })(req, res, next);
    }
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

// Create server
const server = createServer(app);

// Add error handling for the server
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    log(`Error: Port ${PORT} is already in use`);
  } else {
    log(`Server error: ${error.message}`);
  }
  console.error('Server error details:', error);
  process.exit(1);
});

// Start server with detailed error handling
try {
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running in ${isDev ? 'development' : 'production'} mode`);
    log(`API Server listening on http://0.0.0.0:${PORT}`);
    if (isDev) {
      log(`Frontend Dev Server expected on http://localhost:5173`);
    }
  });
} catch (error) {
  log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  console.error('Server startup error details:', error);
  process.exit(1);
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  log(`Uncaught Exception: ${err.message}`);
  console.error('Uncaught exception details:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  log('Unhandled Rejection');
  console.error('Rejection reason:', reason);
  process.exit(1);
});