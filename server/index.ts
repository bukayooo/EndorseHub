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
      
      if (!fs.existsSync(indexPath)) {
        throw new Error('Production build files not found. Run npm run build first.');
      }
      log(`Static files found at ${staticPath}`);

      // Serve static files with correct content types and caching
      const staticOptions = {
        maxAge: '1y',
        etag: true,
        immutable: true,
        lastModified: true,
        index: false,
        setHeaders: (res: Response, filePath: string) => {
          // Set correct MIME types with more specific handling
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
          
          // Enhanced caching strategy
          if (filePath.match(/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|ico|svg)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Vary', 'Accept-Encoding');
          } else {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        }
      };

      // Configure static file serving with proper paths
      const staticPath = path.join(__dirname, '../client/dist');
      
      // First serve specific assets directory with stricter caching
      app.use('/assets', express.static(path.join(staticPath, 'assets'), {
        ...staticOptions,
        index: false,
        fallthrough: true,
        immutable: true,
        maxAge: '31536000', // 1 year in seconds
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
          } else if (filePath.match(/\.(js|mjs)$/)) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          }
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Vary', 'Accept-Encoding');
        }
      }));
      
      // Then serve the rest of static files
      app.use(express.static(staticPath, {
        ...staticOptions,
        index: false,
        fallthrough: true,
        immutable: false,
        maxAge: '86400', // 1 day in seconds
        setHeaders: (res, filePath) => {
          const mimeTypes = {
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
        }
      }));
      
      // Register API routes after static files
      registerRoutes(app);

      // Handle client-side routing - must come after both static and API routes
      app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
          return next();
        }
        
        // Skip direct asset requests
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
          return next();
        }
        
        const indexPath = path.join(__dirname, '../client/dist/index.html');
        log(`Serving index.html for client-side route: ${req.path}`);
        
        res.sendFile(indexPath, {
          maxAge: '0',
          cacheControl: false,
          lastModified: true,
          etag: true,
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
    const PORT = 3000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT} in ${app.get("env")} mode`);
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Server startup error:', error);
    process.exit(1);
  }
})();
