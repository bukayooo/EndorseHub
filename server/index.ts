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
  
  // Trust proxy in all environments for proper cookie handling
  app.set('trust proxy', 1);
  app.enable('trust proxy');

  // CORS configuration
  const allowedOrigins: (string | RegExp)[] = [
    /\.replit\.dev$/,
    /\.replit\.app$/,
    /^https?:\/\/.*\.replit\.(dev|app)(:\d+)?$/,
    /^https?:\/\/.*\.worf\.(replit\.dev|replit\.app)(:\d+)?$/
  ];

  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://0.0.0.0:5173');
  }

  // Add production URL if available
  if (process.env.PRODUCTION_URL) {
    allowedOrigins.push(new RegExp(process.env.PRODUCTION_URL));
  }

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      console.log('[CORS] Checking origin:', origin);
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        }
        const matches = allowed.test(origin);
        console.log('[CORS] Testing', origin, 'against', allowed, ':', matches);
        return matches;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400
  };

  // Basic middleware
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session setup with enhanced security
  const MemoryStoreSession = MemoryStore(session);
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'testimonial.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };

  // Initialize session middleware
  app.use(session(sessionConfig));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Debug middleware for session
  app.use((req, res, next) => {
    console.log('[Session Debug]', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user || null,
      path: req.path
    });
    next();
  });

  // API routes setup
  console.log('[Server] Setting up API routes...');
  const router = express.Router();

  try {
    // Setup auth routes first
    await setupAuthRoutes(router);
    
    // Then other routes
    setupTestimonialRoutes(router);
    setupAnalyticsRoutes(router);

    // Mount API routes
    app.use('/api', router);
    console.log('[Server] API routes mounted at /api');

    // Serve static files
    const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDistPath));

    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10);
    app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});