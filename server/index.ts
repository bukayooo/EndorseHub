import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

const app = express();
app.use(express.json());
// Serve static files with proper MIME types and caching
const serveStaticWithMimeTypes = (directory: string) => {
  const absolutePath = path.join(__dirname, directory);
  if (!fs.existsSync(absolutePath)) {
    log(`Warning: Static directory ${directory} does not exist`);
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  
  return express.static(absolutePath, {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      } else if (filepath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      } else if (filepath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache');
      }
      // Add CORS headers for static assets
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
    fallthrough: true,
    index: false,
    maxAge: '1y'
  });
};

// In production, serve from dist/public first, then fallback to client/public
if (process.env.NODE_ENV === 'production') {
  app.use(serveStaticWithMimeTypes('../dist/public'));
  app.use(serveStaticWithMimeTypes('../client/public'));
} else {
  app.use(serveStaticWithMimeTypes('../client/public'));
}
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Log API requests and static file requests in production
    if (path.startsWith("/api") || (process.env.NODE_ENV === 'production' && path.endsWith('.css'))) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 3000 to avoid conflicts
  // this serves both the API and the client
  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
