import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuthRoutes } from './routes/auth.routes';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';
import type { CorsOptions } from 'cors';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Environment configuration
  const isDev = process.env.NODE_ENV !== 'production';
  console.log('[Server] Environment:', { isDev, NODE_ENV: process.env.NODE_ENV });

  // Basic middleware setup before anything else
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Always enable trust proxy for consistent behavior
  app.set('trust proxy', 1);
  app.enable('trust proxy');

  // Session setup with environment-aware configuration
  const MemoryStoreSession = MemoryStore(session);
  
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'testimonial.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    store: new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
      stale: false
    }),
    cookie: {
      secure: !isDev,
      httpOnly: true,
      sameSite: isDev ? 'lax' : 'none',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    }
  } satisfies session.SessionOptions;

  // Apply session middleware
  app.use(session(sessionConfig));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // CORS configuration with improved origin handling
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      console.log('[CORS] Checking origin:', origin);
      
      const allowedOrigins = [
        /\.replit\.dev$/,
        /\.replit\.app$/,
        /^https:\/\/.*\.worf\.replit\.dev(:\d+)?$/,
        'http://localhost:3000',
        'http://localhost:5173',
        /^https?:\/\/[^.]+\.repl\.co$/
      ];

      // Allow requests with no origin (like mobile apps, curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      for (const pattern of allowedOrigins) {
        console.log('[CORS] Testing', origin, 'against', pattern, ':', 
          pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
        );
        
        if (pattern instanceof RegExp ? pattern.test(origin) : pattern === origin) {
          callback(null, true);
          return;
        }
      }

      console.log('[CORS] Rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400 // 24 hours
  };

  // Apply CORS middleware
  app.use(cors(corsOptions));

  // Debug middleware for tracking requests
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.path}`, {
      body: req.body,
      query: req.query,
      user: req.user?.id,
      session: req.sessionID,
      isAuthenticated: req.isAuthenticated?.()
    });
    next();
  });

  // API routes setup
  console.log('[Server] Setting up API routes...');
  const router = express.Router();
  
  // Setup auth first
  await setupAuthRoutes(router);
  
  // Then other routes
  setupTestimonialRoutes(router);
  setupAnalyticsRoutes(router);

  // Mount API routes
  app.use('/api', router);
  console.log('[Server] API routes mounted at /api');

  // Static files and SPA fallback
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server] Error:', err);
    res.status(500).json({ 
      success: false,
      error: isDev ? err.message : 'Internal Server Error'
    });
  });

  // Start server with port retry logic
  const startPort = parseInt(process.env.PORT || '3000', 10);
  const maxRetries = 3;
  let currentPort = startPort;
  let server: ReturnType<typeof app.listen>;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      server = app.listen(currentPort, '0.0.0.0', () => {
        console.log(`[Server] API Server running at http://0.0.0.0:${currentPort}`);
      });
      break; // Successfully started server
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === 'EADDRINUSE' && attempt < maxRetries - 1) {
        console.log(`[Server] Port ${currentPort} in use, trying next port`);
        currentPort++;
        continue;
      }
      throw err; // Re-throw if it's not a port issue or we're out of retries
    }
  }

  // Handle server shutdown gracefully
  process.on('SIGTERM', () => {
    console.log('[Server] Received SIGTERM signal. Shutting down gracefully...');
    server?.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });

  return app;
}

// Start server with proper error handling
startServer().catch(error => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});