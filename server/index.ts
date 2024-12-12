import path from "path";
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

      // Serve static files with correct content types and caching
      const staticOptions = {
        maxAge: '1y',
        etag: true,
        immutable: true,
        lastModified: true,
        index: false,
        setHeaders: (res: Response, filePath: string) => {
          // Set correct MIME types
          if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
          }
          
          // Set caching headers
          if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else {
            res.setHeader('Cache-Control', 'no-cache');
          }
        }
      };

      // Serve the static files from the dist directory
      app.use(express.static(path.join(__dirname, '../client/dist'), staticOptions));
      
      // Register API routes
      registerRoutes(app);

      // Handle client-side routing - must come after API routes
      app.get('*', (req, res, next) => {
        if (!req.path.startsWith('/api')) {
          const indexPath = path.join(__dirname, '../client/dist/index.html');
          log(`Serving index.html for path: ${req.path}`);
          res.sendFile(indexPath, (err) => {
            if (err) {
              log(`Error serving index.html: ${err.message}`);
              next(err);
            }
          });
        } else {
          next();
        }
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
