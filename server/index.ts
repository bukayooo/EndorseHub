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
      
      // Verify static files exist
      const staticPath = path.join(__dirname, '../client/dist');
      const indexPath = path.join(staticPath, 'index.html');
      
      try {
        if (!fs.existsSync(staticPath)) {
          log('Static directory not found, creating it...');
          fs.mkdirSync(staticPath, { recursive: true });
        }
        
        if (!fs.existsSync(indexPath)) {
          log('Warning: index.html not found in production build directory');
          // Don't throw, let the build process create it
        } else {
          log(`Static files found at ${staticPath}`);
        }
      } catch (error) {
        log(`Error checking static files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue execution, let the build process handle it
      }

      // Register API routes first
      registerRoutes(app);

      // Serve static files with cache control
      app.use('/assets', express.static(path.join(staticPath, 'assets'), {
        maxAge: '31536000',
        etag: true,
        index: false,
        immutable: true,
        setHeaders: (res, filePath) => {
          const mimeTypes: Record<string, string> = {
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.mjs': 'application/javascript; charset=utf-8',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
          };
          
          const ext = Object.keys(mimeTypes).find(ext => filePath.endsWith(ext));
          if (ext) {
            res.setHeader('Content-Type', mimeTypes[ext]);
          }

          // Aggressive caching for assets
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Vary', 'Accept-Encoding');
        }
      }));

      // Serve remaining static files
      app.use(express.static(staticPath, {
        maxAge: '1d',
        etag: true,
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            // No caching for HTML files
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        }
      }));

      // Register API routes before catch-all handler
      registerRoutes(app);

      // Handle client-side routing
      app.get('*', (req, res, next) => {
        // Skip API routes and direct file requests
        if (req.path.startsWith('/api') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
          return next();
        }
        
        log(`Serving index.html for client-side route: ${req.path}`);
        res.sendFile(indexPath, {
          maxAge: '0',
          etag: true,
          lastModified: true,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
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
    const PORT = process.env.PORT || 3000;
    const startServer = () => {
      return new Promise((resolve, reject) => {
        try {
          server.listen(PORT, "0.0.0.0", () => {
            log(`Server running on port ${PORT} in ${app.get("env")} mode`);
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