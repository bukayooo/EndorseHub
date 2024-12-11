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
    // Allow requests from any Replit domain, localhost and local network for development
    const allowedOrigins = [
      /^https?:\/\/[a-zA-Z0-9-]+\.replit\.dev$/,
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/172\.31\.\d+\.\d+(:\d+)?$/,
      /^https?:\/\/0\.0\.0\.0(:\d+)?$/
    ];
    const isAllowed = !origin || allowedOrigins.some(allowed => 
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// CORS preflight
app.options('*', cors());

// Handle JSON parsing errors and set proper headers
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ 
      error: 'Invalid JSON',
      details: err.message
    });
  }
  
  if (err instanceof Error) {
    console.error('Request error:', err);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: app.get('env') === 'development' ? err.message : undefined
    });
  }
  
  next(err);
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Serve static files from client/public directory
app.use(express.static(path.join(__dirname, '../client/public')));

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

  // Global error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Ensure we're sending a proper JSON response with correct headers
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(status).json({ 
        error: message,
        status: status,
        details: app.get('env') === 'development' ? {
          stack: err.stack,
          timestamp: new Date().toISOString()
        } : undefined
      });
    }
    
    // Enhanced error logging
    console.error('Error:', {
      status,
      message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: _req.path
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
  const HOST = '0.0.0.0'; // Always bind to all network interfaces
  
  try {
    // Check if port is already in use
    const net = await import('net');
    const testServer = net.createServer()
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use. Please free up the port and try again.`);
          process.exit(1);
        }
        throw err;
      })
      .once('listening', () => {
        testServer.close();
        startServer();
      })
      .listen(PORT);

    async function startServer() {
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
    }
  } catch (error) {
    console.error('Critical error starting server:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
})();
