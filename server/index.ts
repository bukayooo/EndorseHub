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

  // Session setup
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
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    }
  };

  app.use(session(sessionConfig));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // CORS configuration - after session but before routes
  const corsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = [
        /\.replit\.dev$/,
        /\.replit\.app$/,
        /^https:\/\/.*\.worf\.replit\.dev(:\d+)?$/,
        'http://localhost:3000',
        'http://localhost:5173'
      ];

      if (!origin || allowedOrigins.some(pattern => 
        pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
      )) {
        callback(null, true);
      } else {
        console.log('[CORS] Rejected origin:', origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
  };

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
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[Server] Error:', err);
    res.status(500).json({ 
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
  });

  // Start server
  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
  });

  return app;
}

// Start server with proper error handling
startServer().catch(error => {
  console.error('[Server] Startup error:', error);
});