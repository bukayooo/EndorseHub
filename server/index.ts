import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
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

// Configure CORS to allow frontend requests
app.use(cors({
  origin: (origin, callback) => {
    // In development, accept requests from development server
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Express server
      'http://localhost:3001',  // Alternate Express port
      process.env.FRONTEND_URL  // Production URL
    ].filter(Boolean); // Remove undefined/null values
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// CORS preflight options
app.options('*', cors());

// Handle JSON parsing errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next(err);
});

app.use(express.json());
// Serve static files from client/public directory
app.use(express.static(path.join(__dirname, '../client/public')));
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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use a different port for development to avoid conflicts
  const PRIMARY_PORT = process.env.PORT || 3000;
  const FALLBACK_PORT = 3001;
  
  // Enhanced error handling for server startup
  const startServer = async () => {
    const tryPort = async (port: number): Promise<number> => {
      return new Promise((resolve, reject) => {
        const instance = server.listen(port, "0.0.0.0", () => {
          const actualPort = (instance.address() as any)?.port;
          resolve(actualPort);
        });

        instance.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${port} is in use`);
            instance.close();
            resolve(0); // Signal to try next port
          } else {
            reject(err);
          }
        });
      });
    };

    // Try primary port first, then fallback
    const primaryResult = await tryPort(PRIMARY_PORT);
    if (primaryResult > 0) {
      return primaryResult;
    }

    log(`Trying fallback port ${FALLBACK_PORT}...`);
    const fallbackResult = await tryPort(FALLBACK_PORT);
    if (fallbackResult > 0) {
      return fallbackResult;
    }

    throw new Error('Could not start server on any available port');
  };

  try {
    await startServer();
    const actualPort = (server.address() as any)?.port;
    log(`Server is ready and listening on port ${actualPort}`);
  } catch (error) {
    console.error('Critical error starting server:', error);
    process.exit(1);
  }
})();
