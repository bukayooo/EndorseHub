import express from 'express';
import cors from 'cors';
import path from 'path';
import { setupAuth } from './auth';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import { setupStatsRoutes } from './routes/stats.routes';
import { db, checkConnection } from './db';
import session from 'express-session';
import MemoryStore from 'memorystore';

export async function createApp() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Initialize database first
  console.log('[App] Initializing database connection');
  let retries = 5;  // Increase retries
  let lastError;
  while (retries > 0) {
    try {
      console.log('[App] Database URL format:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('Database connection check failed');
      }
      console.log('[App] Database connection verified successfully');
      break;
    } catch (error) {
      retries--;
      console.error('[App] Database connection attempt failed:', {
        retriesLeft: retries,
        error: error.message,
        code: error.code
      });
      if (retries === 0) {
        console.error('[App] All database connection attempts failed');
        throw new Error(`Database initialization failed after 3 attempts: ${error.message}`);
      }
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('[App] Creating Express application');
  const app = express();
    
  // Core middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Enhanced CORS setup with proper cookie handling
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'http://localhost:5173'
      : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
  }));
  console.log('[App] CORS configured with cookie support');

  // Setup session store
  const MemoryStoreSession = MemoryStore(session);
  const sessionStore = new MemoryStoreSession({
    checkPeriod: 86400000,
    ttl: 24 * 60 * 60 * 1000,
    stale: false
  });

  // Session middleware must come before passport
  console.log('[App] Setting up session middleware');
  app.use(session({
    name: 'testimonial.sid',
    secret: 'development_secret_key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'lax'
    },
    store: sessionStore
  }));

  // Initialize authentication (must come after session)
  console.log('[App] Setting up authentication');
  await setupAuth(app);

  // Debug middleware (only after auth is properly initialized)
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log('[App] Request state:', {
        path: req.path,
        sessionID: req.sessionID,
        authenticated: req.isAuthenticated?.() || false,
        userId: req.user?.id
      });
      next();
    });
  }

  // API routes setup
  console.log('[App] Setting up API routes');
  const apiRouter = express.Router();

  // Debug middleware for API routes
  apiRouter.use((req, res, next) => {
    console.log('[API] Request:', {
      method: req.method,
      path: req.path,
      user: req.user?.id,
      isAuthenticated: req.isAuthenticated()
    });
    next();
  });

  // Debug middleware for API routes
  apiRouter.use((req, res, next) => {
    console.log('[API] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      user: req.user?.id,
      auth: req.isAuthenticated()
    });
    next();
  });

  // Mount API routes
  console.log('[App] Setting up API routes...');
  setupTestimonialRoutes(apiRouter);
  setupWidgetRoutes(apiRouter);
  setupStatsRoutes(apiRouter);
  console.log('[App] API routes setup complete');

  // API error handler
  apiRouter.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API Error]', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  });
  
  // Mount API router at /api prefix
  app.use('/api', apiRouter);
  console.log('[App] API router mounted at /api prefix');

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Static file serving for production build
  if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(process.cwd(), '..', 'client', 'dist');
    app.use(express.static(clientDistPath));
    
    // SPA fallback for production
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: clientDistPath });
    });
  }

  console.log('[App] Application setup complete');
  return app;
}
