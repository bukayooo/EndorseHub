import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import MemoryStore from "memorystore";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { createApp, startServer } from "./app";
import { setupAuth } from "./auth";
import { setupRoutes as setupAppRoutes } from "./routes";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use port 3000 for development, process.env.PORT for production
const port = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) : 3000;
const SessionStore = MemoryStore(session);

// Enhanced logging utility with timestamps and request IDs
function log(message: string, type: 'info' | 'error' | 'debug' = 'info', meta: Record<string, any> = {}) {
  const time = new Date().toLocaleTimeString();
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  console.log(`${time} [server] ${type.toUpperCase()}: ${message}${metaStr}`);
}

// Middleware to handle CORS
function setupCORS(app: Express) {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://testimonialhub.repl.co']
    : ['http://localhost:5173', 'http://0.0.0.0:5173'];

  app.use(cors.default({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        log(`Blocked request from unauthorized origin: ${origin}`, 'debug');
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}

// Middleware to handle sessions
function setupSessions(app: Express) {
  app.use(session({
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax'
    },
    store: new SessionStore({
      checkPeriod: 86400000 // Clear expired sessions
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    name: 'testimonial.sid' // Custom session ID name
  }));
}

// Request logging middleware
function setupRequestLogging(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = Math.random().toString(36).substring(7);
    const start = Date.now();
    
    // Add requestId to the response headers
    res.setHeader('X-Request-ID', requestId);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api')) {
        log(`${req.method} ${req.path}`, 'info', {
          requestId,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('user-agent')
        });
      }
    });
    next();
  });
}



async function bootstrap() {
  try {
    // Create Express application
    const app = createApp();
    
    // Setup authentication
    await setupAuth(app);
    
    // Setup routes
    await setupAppRoutes(app);
    
    // Start server
    await startServer(app);
  } catch (error) {
    console.error("Failed to bootstrap application:", error);
    process.exit(1);
  }
}

// Start application
bootstrap().catch((error) => {
  console.error("Unhandled bootstrap error:", error);
  process.exit(1);
});