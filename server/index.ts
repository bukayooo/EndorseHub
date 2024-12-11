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
  origin: function(origin, callback) {
    // Allow requests from any Replit domain and localhost for development
    const allowedOrigins = [
      /^https?:\/\/[a-zA-Z0-9-]+\.replit\.dev$/,
      'http://localhost:5173',
      'https://localhost:5173'
    ];
    const isAllowed = !origin || allowedOrigins.some(allowed => 
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// CORS preflight
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
    
    // Ensure we're sending a proper JSON response
    if (!res.headersSent) {
      res.status(status).json({ 
        error: message,
        status: status
      });
    }
    
    // Log the error but don't throw it
    console.error('Error:', {
      status,
      message,
      stack: err.stack
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use port 3000 for consistency
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
  
  try {
    await new Promise<void>((resolve, reject) => {
      server.listen(Number(PORT), HOST, () => {
        const addr = server.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : Number(PORT);
        log(`Server started successfully on ${HOST}:${actualPort}`);
        resolve();
      }).on('error', (err: Error) => {
        console.error('Failed to start server:', err);
        reject(err);
      });
    });
    
    const addr = server.address();
    const actualPort = typeof addr === 'object' && addr ? addr.port : Number(PORT);
    log(`Server is ready and listening on ${HOST}:${actualPort}`);
  } catch (error) {
    console.error('Critical error starting server:', error);
    process.exit(1);
  }
})();
