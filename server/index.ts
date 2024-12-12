import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
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

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  log(`Uncaught Exception: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  log(`Unhandled Rejection: ${reason}`);
});

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
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
    if (path.startsWith("/api")) {
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
  const server = createServer(app);

  try {
    if (app.get("env") === "development") {
      // Development mode: Use Vite's dev server
      log("Starting in development mode with Vite middleware");
      await setupVite(app, server);
    } else {
      // Production mode: Configure static file serving
      log("Starting in production mode with static file serving");
      app.set("trust proxy", 1);
      
      // Enhanced static file configuration
      const staticPath = path.join(__dirname, '../client/dist');
      const indexPath = path.join(staticPath, 'index.html');
      
      // Ensure static directories exist
      try {
        if (!fs.existsSync(staticPath)) {
          log('Creating static directory structure...');
          fs.mkdirSync(path.join(staticPath, 'assets'), { recursive: true });
        }
        log(`Static files directory configured at ${staticPath}`);
      } catch (error) {
        log(`Error configuring static files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Register API routes first to ensure they take precedence
      registerRoutes(app);

      // Configure static asset serving with proper MIME types and compression
      const mimeTypes: Record<string, string> = {
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.jsx': 'application/javascript; charset=utf-8',
        '.ts': 'application/javascript; charset=utf-8',
        '.tsx': 'application/javascript; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.json': 'application/json; charset=utf-8'
      };

      // Serve assets with aggressive caching and proper MIME types
      app.use('/assets', express.static(path.join(staticPath, 'assets'), {
        maxAge: '31536000',
        etag: true,
        index: false,
        immutable: true,
        setHeaders: (res, filePath) => {
          // Set correct MIME type based on file extension
          const ext = Object.keys(mimeTypes).find(ext => filePath.toLowerCase().endsWith(ext));
          if (ext) {
            res.setHeader('Content-Type', mimeTypes[ext]);
          }
          
          // Set caching headers
          const cacheControl = filePath.match(/\.(css|js|mjs)$/)
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=86400';
          
          res.setHeader('Cache-Control', cacheControl);
          res.setHeader('Vary', 'Accept-Encoding');
          
          // Add security headers
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
      }));

      // Serve other static files with moderate caching
      app.use(express.static(staticPath, {
        maxAge: '1d',
        etag: true,
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
          // Set correct MIME type for all files
          const ext = Object.keys(mimeTypes).find(ext => filePath.endsWith(ext));
          if (ext) {
            res.setHeader('Content-Type', mimeTypes[ext]);
          }
        }
      }));

      // Enhanced client-side routing handler
      app.get('*', (req, res, next) => {
        // Skip API routes and static assets
        if (req.path.startsWith('/api') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
          return next();
        }
        
        // Check if index.html exists
        if (!fs.existsSync(indexPath)) {
          log('Warning: index.html not found, waiting for build...');
          return res.status(503).send('Application is building, please try again in a moment.');
        }
        
        log(`Serving index.html for client-side route: ${req.path}`);
        res.sendFile(indexPath, {
          maxAge: '0',
          etag: true,
          lastModified: true,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Content-Type': 'text/html; charset=utf-8'
          }
        }, (err) => {
          if (err) {
            log(`Error serving index.html: ${err.message}`);
            next(err);
          }
        });
      });
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message} (${status})`);
      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    // Start the server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const startServer = () => {
      return new Promise((resolve, reject) => {
        try {
          if (isNaN(PORT)) {
            throw new Error('Invalid PORT configuration');
          }
          
          server.listen(PORT, '0.0.0.0', () => {
            log(`Server running on port ${PORT} in ${app.get('env')} mode`);
            resolve(true);
          });
          
          server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
              log(`Port ${PORT} is already in use. Please choose a different port.`);
              reject(new Error(`Port ${PORT} is already in use`));
            } else {
              log(`Server error: ${error.message}`);
              reject(error);
            }
          });
        } catch (error) {
          log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
          reject(error);
        }
      });
    };

    await startServer();
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Server startup error:', error);
    process.exit(1);
  }
})();