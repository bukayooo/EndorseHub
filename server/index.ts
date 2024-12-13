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

  // CORS configuration
  const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://0.0.0.0:5173',
      'http://172.31.196.3:5173',
      'http://172.31.196.62:5173',
      'http://172.31.196.85:5173',
      /\.replit\.dev$/  // Allow all replit.dev subdomains
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-XSRF-TOKEN'],
    exposedHeaders: ['Set-Cookie', 'X-XSRF-TOKEN'],
    maxAge: 86400, // 24 hours in seconds
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Basic middleware
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session setup
  const MemoryStoreSession = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Debug middleware - now comes after session setup
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`, {
      body: req.body,
      query: req.query,
      user: req.user?.id,
      session: req.session?.id,
      isAuthenticated: req.isAuthenticated?.()
    });
    next();
  });

  // API routes
  console.log('[Server] Setting up API routes...');
  const router = express.Router();
  
  // Setup auth first
  await setupAuthRoutes(router);
  
  // Then other routes
  setupTestimonialRoutes(router);
  setupAnalyticsRoutes(router);

  // Mount API routes with debug logging
  app.use('/api', (req, res, next) => {
    console.log('[API] Request:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id,
      isAuthenticated: req.isAuthenticated?.()
    });
    next();
  }, router);
  console.log('[Server] API routes mounted at /api');

  // Serve static files from the client build directory
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  // SPA fallback - this must come after API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // Error handling middleware - should be last
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Server] Error:', err);
    
    // Don't expose internal errors to client
    const statusCode = err.status || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : err.message;
    
    res.status(statusCode).json({ 
      success: false,
      error: message
    });
  });

  // 404 handler - should be after routes but before error handler
  app.use((req, res) => {
    console.log('[Server] 404:', req.method, req.url);
    res.status(404).json({
      success: false,
      error: `Cannot ${req.method} ${req.url}`
    });
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch(error => {
  console.error('[Server] Startup error:', error);
});