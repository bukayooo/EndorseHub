import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { setupAuthRoutes } from './routes/auth.routes';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();

    // Basic middleware setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Trust proxy for secure cookies
    app.set('trust proxy', 1);

    // CORS setup with proper origin handling
    const corsOptions = {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          /\.replit\.dev$/,
          /\.replit\.app$/,
          /^https:\/\/.*\.worf\.replit\.dev(:\d+)?$/
        ];
        
        const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
        if (isAllowed) {
          callback(null, true);
        } else {
          console.log('[CORS] Origin not allowed:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposedHeaders: ['Set-Cookie']
    };

    app.use(cors(corsOptions));

    // Session store setup
    const MemoryStoreSession = MemoryStore(session);
    const sessionMiddleware = session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      name: 'testimonial.sid',
      resave: true,
      saveUninitialized: true,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
        stale: false
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    });

    app.use(sessionMiddleware);

    // Initialize passport after session
    app.use(passport.initialize());
    app.use(passport.session());

    // Debug middleware
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

    // Setup routes
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

    // Start server on port 3000 only
    const port = 3000;
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
