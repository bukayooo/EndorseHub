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
app.use(express.json());

// Basic middleware setup
app.use(express.urlencoded({ extended: false }));

// In production, serve static files with appropriate headers
if (app.get("env") === "production") {
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    maxAge: '1y',
    etag: true,
    immutable: true,
    lastModified: true,
    index: false, // Disable automatic serving of index.html
  }));
}

// Development static files
app.use(express.static(path.join(__dirname, '../client/public'), {
  etag: true,
  lastModified: true,
}));

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
  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    // In development, use Vite's dev server
    await setupVite(app, server);
  } else {
    // In production:
    // 1. Serve static files first with proper headers
    app.use(express.static(path.join(__dirname, '../client/dist'), {
      maxAge: '1y',
      etag: true,
      immutable: true,
      lastModified: true,
      index: false, // Disable automatic serving of index.html
      setHeaders: (res, filePath) => {
        // Ensure correct content types
        if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
        // Set caching headers
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }));
    
    // 2. Then register API routes
    registerRoutes(app);
    
    // 3. Finally, handle client-side routing
    app.get('*', (req, res) => {
      if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
      }
    });
  }

  // Serve the app on port 3000 to avoid conflicts
  // this serves both the API and the client
  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
