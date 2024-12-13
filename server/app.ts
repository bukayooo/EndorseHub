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
  // Initialize database first
  console.log('[App] Initializing database connection');
  try {
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('Database connection check failed');
    }
    console.log('[App] Database connection verified');
  } catch (error) {
    console.error('[App] Database connection failed:', error);
    throw error;
  }
  
  console.log('[App] Creating Express application');
  const app = express();
    
  // Core middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Basic CORS setup for development
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));
  console.log('[App] CORS configured for development');

  // Simple session setup
  const MemoryStoreSession = MemoryStore(session);
  app.use(session({
    secret: 'development_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: false
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000
    })
  }));

  // Initialize authentication
  console.log('[App] Setting up authentication');
  await setupAuth(app);

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
  
  // Mount API router
  app.use('/api', apiRouter);

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
