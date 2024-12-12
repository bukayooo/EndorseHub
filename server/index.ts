import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple logging function
const log = (message: string) => console.log(`[Server] ${message}`);

async function createApp() {
  const app = express();
  const isDev = process.env.NODE_ENV === "development";

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register API routes first
  registerRoutes(app);

  // Development mode with Vite proxy
  if (isDev) {
    log("Setting up development server with Vite proxy...");
    app.use((req, res, next) => {
      if (!req.url.startsWith('/api')) {
        createProxyMiddleware({
          target: 'http://localhost:5173',
          changeOrigin: true,
          ws: true
        })(req, res, next);
      } else {
        next();
      }
    });
  } else {
    // Production mode with static file serving
    const distPath = path.resolve(__dirname, "../dist/public");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    log(`Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  });

  return app;
}

async function startServer() {
  try {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const app = await createApp();
    const server = createServer(app);

    // Try to close any existing connections
    try {
      server.close();
    } catch (e) {
      // Ignore close errors
    }

    // Handle server startup with retries
    let retries = 3;
    while (retries > 0) {
      try {
        await new Promise<void>((resolve, reject) => {
          server.listen(PORT, "0.0.0.0", () => {
            log(`Server running on port ${PORT}`);
            resolve();
          });

          server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
              log(`Port ${PORT} is busy, retrying...`);
              setTimeout(() => {
                server.close();
                server.listen(PORT, "0.0.0.0");
              }, 1000);
            } else {
              reject(error);
            }
          });
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  log(`Unhandled error: ${error.message}`);
  process.exit(1);
});