import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = Number(process.env.PORT) || 3000;

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

function handleError(err: Error) {
  log(`ERROR: ${err.message}`);
  if (err.stack) {
    log(`Stack trace: ${err.stack}`);
  }
  process.exit(1);
}

// Basic error handling
process.on('uncaughtException', handleError);
process.on('unhandledRejection', (reason) => {
  handleError(reason instanceof Error ? reason : new Error(String(reason)));
});

async function startServer() {
  try {
    const app = express();
    log("Initializing server...");
    
    // Configure JSON and URL-encoded body parsing before routes
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Request logging middleware with better error tracking
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      // Capture the original json method
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

    // Register API routes before Vite middleware
    log("Setting up API routes...");
    registerRoutes(app);

    // Create HTTP server
    const server = createServer(app);

    // Development: Use Vite middleware
    // Production: Use static file serving
    if (app.get("env") === "development") {
      log("Setting up Vite middleware...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    // Register API routes after middleware setup
    registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message} (${status})`);
      res.status(status).json({ message });
    });

    // Use a different port in development to avoid conflicts with Vite
    const PORT = process.env.PORT || 3000;
    
    server.listen(PORT, '0.0.0.0', () => {
      log("=".repeat(40));
      log(`Server running in ${app.get("env")} mode`);
      log(`Server listening on port ${PORT}`);
      log(`API available at http://localhost:${PORT}/api`);
      if (app.get("env") === "development") {
        log(`Frontend dev server expected at http://localhost:5173`);
      }
      log("=".repeat(40));
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        log(`Error: Port ${PORT} is already in use`);
      } else {
        log(`Server error: ${error.message}`);
      }
      process.exit(1);
    });

  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
  }
}

startServer().catch(handleError);
