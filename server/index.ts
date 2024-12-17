import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuthRoutes } from './routes/auth.routes';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isDev = process.env.NODE_ENV !== 'production';
  console.log('[Server] Environment:', { isDev, NODE_ENV: process.env.NODE_ENV });

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Trust proxy setup
  app.set('trust proxy', 1);

  // Session setup with memory store
  const MemoryStoreSession = MemoryStore(session);
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // 24h
    }),
    name: 'testimonial.sid',
    cookie: {
      secure: !isDev,
      httpOnly: true,
      sameSite: isDev ? 'lax' : 'none',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    }
  };

  app.use(session(sessionConfig));

  // Initialize authentication
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure CORS
  app.use(cors({
    origin: isDev ? 'http://localhost:5173' : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));

  // API routes
  console.log('[Server] Setting up API routes...');
  const router = express.Router();
  await setupAuthRoutes(router);
  setupTestimonialRoutes(router);
  setupAnalyticsRoutes(router);
  app.use('/api', router);
  console.log('[Server] API routes mounted at /api');

  // Static file serving
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));
  
  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // Start server
  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
    });
    return server;
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    throw error;
  }
}

// Start server and handle errors
try {
  await startServer();
} catch (error) {
  console.error('[Server] Fatal error:', error);
  process.exit(1);
}
