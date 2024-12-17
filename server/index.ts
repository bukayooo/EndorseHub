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

    // CORS setup with specific origin handling
    const corsOptions = {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        console.log('[CORS] Checking origin:', origin);
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          /\.replit\.dev$/,
          /\.replit\.app$/,
          /^https:\/\/.*\.worf\.replit\.dev(:\d+)?$/
        ];
        
        // Test the origin against allowed patterns
        const isAllowed = allowedOrigins.some(pattern => {
          console.log('[CORS] Testing', origin, 'against', pattern, ':', pattern.test(origin));
          return pattern.test(origin);
        });
        
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

    // Session store setup with enhanced security
    const MemoryStoreSession = MemoryStore(session);
    const sessionMiddleware = session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      name: 'testimonial.sid',
      resave: true,
      saveUninitialized: true,
      rolling: true,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
        stale: false
      }),
      cookie: {
        secure: false, // Set to false for both dev and prod to ensure cookies work
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
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

    // Start server with retries
    const startServer = async () => {
      const port = parseInt(process.env.PORT || '3000', 10);
      try {
        const server = await new Promise((resolve, reject) => {
          const server = app.listen(port, '0.0.0.0', () => {
            console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
            resolve(server);
          }).on('error', (error: any) => {
            console.error('[Server] Failed to start server:', error);
            reject(error);
          });
        });
        return server;
      } catch (error) {
        console.error('[Server] Critical server error:', error);
        process.exit(1);
      }
    };

    await startServer();

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});
