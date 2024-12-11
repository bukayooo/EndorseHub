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
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://0.0.0.0:5173', 'http://172.31.196.15:5173']
    : process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Enable pre-flight requests for all routes
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

// Request logging middleware
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

// Initialize Express server with error handling
function setupServer(app: express.Application): express.Application {
  // Global error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
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
    
    console.error('Error:', {
      status,
      message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: _req.path
    });
  });

  return app;
}

// Start server function
async function startServer(port: number, host: string): Promise<void> {
  try {
    // Setup routes and create server
    registerRoutes(app);
    const server = createServer(setupServer(app));

    // Configure Vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.listen(port, host)
        .once('listening', () => {
          const addr = server.address();
          const actualPort = typeof addr === 'object' && addr ? addr.port : port;
          log(`Server started successfully on ${host}:${actualPort}`);
          resolve();
        })
        .once('error', (err: Error) => {
          console.error('Failed to start server:', err);
          reject(err);
        });
    });
  } catch (error) {
    console.error('Critical error starting server:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

// Check if port is available
async function checkPort(port: number): Promise<boolean> {
  const net = await import('net');
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
}

// Main execution
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

(async () => {
  try {
    const isPortAvailable = await checkPort(PORT);
    if (!isPortAvailable) {
      console.error(`Port ${PORT} is already in use. Please free up the port and try again.`);
      process.exit(1);
    }

    await startServer(PORT, HOST);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
})();
