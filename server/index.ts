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
      // Set appropriate MIME types for different file types
      if (filepath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        // Use a shorter cache time for CSS during development
        const maxAge = process.env.NODE_ENV === 'production' ? 31536000 : 0;
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
        if (process.env.NODE_ENV === 'development') {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      } else if (filepath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filepath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
      
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'same-origin');
      
      // Add Vary header for proper caching with compression
      res.setHeader('Vary', 'Accept-Encoding');
    },
    etag: true,
    lastModified: true,
    maxAge: process.env.NODE_ENV === 'production' ? 31536000000 : 0, // 1 year in production, no cache in dev
    immutable: process.env.NODE_ENV === 'production',
    index: false,
    fallthrough: true
  });
};

// Configure static file serving based on environment
if (process.env.NODE_ENV === 'production') {
  // Serve CSS files with proper MIME type and path resolution
  app.get('*.css', (req, res, next) => {
    const possiblePaths = [
      path.join(__dirname, '../dist/public', req.path),
      path.join(__dirname, '../client/public', req.path),
      path.join(__dirname, '../client/src', req.path)
    ];

    log(`Looking for CSS file: ${req.path}`);
    
    // Try each possible path
    for (const cssPath of possiblePaths) {
      if (fs.existsSync(cssPath)) {
        log(`Found CSS at: ${cssPath}`);
        return res.set({
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'public, max-age=31536000',
          'X-Content-Type-Options': 'nosniff',
          'Access-Control-Allow-Origin': '*',
          'Vary': 'Accept-Encoding'
        }).sendFile(cssPath);
      }
      log(`CSS not found at: ${cssPath}`);
    }
    
    log(`CSS not found in any location: ${req.path}`);
    next();
  });

  // Serve production assets in order of priority
  app.use('/assets', serveStaticWithMimeTypes('../dist/public/assets'));
  app.use(serveStaticWithMimeTypes('../dist/public'));
  app.use(serveStaticWithMimeTypes('../client/public'));
} else {
  // Development static file serving
  app.use(serveStaticWithMimeTypes('../client/public'));
  app.use(serveStaticWithMimeTypes('../client/src'));
  app.use(serveStaticWithMimeTypes('../dist/public'));
}

// Log all static file requests in both development and production
app.use((req, res, next) => {
  if (req.path.endsWith('.css')) {
    log(`Attempting to serve CSS: ${req.path} (${process.env.NODE_ENV} mode)`);
  }
  next();
});

// Log all static file requests in both development and production
app.use((req, res, next) => {
  if (req.path.endsWith('.css')) {
    log(`Attempting to serve CSS: ${req.path} (${process.env.NODE_ENV} mode)`);
  }
  next();
});

// Enhanced error handling for static files
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (req.path.endsWith('.css')) {
    log(`Error serving CSS ${req.path}: ${err.message}`);
    // Send a more detailed error in development
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).send(`CSS Error: ${err.message}`);
    }
  }
  next(err);
});

// Log successful CSS responses
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(...args) {
    if (req.path.endsWith('.css')) {
      log(`Successfully served CSS: ${req.path} (${res.getHeader('Content-Type')})`);
    }
    return originalSend.apply(res, args);
  };
  next();
});
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
