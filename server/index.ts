import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuthRoutes } from './routes/auth.routes';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';
import { setupStripeRoutes } from './routes/stripe.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';
import fs from 'fs';


// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();

    // CORS configuration
    const allowedOrigins: (string | RegExp)[] = [
      'http://localhost:5173',
      'http://0.0.0.0:5173',
      'http://172.31.196.3:5173',
      'http://172.31.196.62:5173',
      'http://172.31.196.85:5173',
      /\.replit\.dev$/,  // Allow all replit.dev subdomains
      /\.replit\.app$/,  // Allow all replit.app subdomains
      /^https:\/\/.*\.worf\.replit\.dev(:\d+)?$/,  // Allow Replit development URLs
      /^https:\/\/endorsehub\.replit\.app(:\d+)?$/  // Allow your specific app
    ];

    // Add CLIENT_URL if it exists
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }

    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          return callback(null, true);
        }

        // Check if the origin is allowed
        const isAllowed = allowedOrigins.some(allowed => {
          if (typeof allowed === 'string') {
            return allowed === origin;
          }
          // For RegExp, test the origin
          return allowed.test(origin);
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
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-XSRF-TOKEN'],
      exposedHeaders: ['Set-Cookie'],
      maxAge: 86400 // 24 hours in seconds
    };

    // Basic middleware
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Stripe webhook needs raw body parsing - must come before JSON middleware
    app.post('/api/billing/webhook', express.raw({ type: 'application/json' }));

    // Session setup
    const MemoryStoreSession = MemoryStore(session);
    const sessionConfig: session.SessionOptions = {
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      name: 'testimonial.sid',
      resave: true,
      saveUninitialized: true,
      rolling: true,
      store: new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      }
    };

    // In production, ensure secure cookies and trust proxy
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
      app.enable('trust proxy');
    }

    app.use(session(sessionConfig));

    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // API routes
    console.log('[Server] Setting up API routes...');
    const router = express.Router();

    // Setup auth first
    await setupAuthRoutes(router);

    // Then other routes
    setupTestimonialRoutes(router);
    setupAnalyticsRoutes(router);
    setupStripeRoutes(router);
    setupWidgetRoutes(router);

    // Mount API routes at /api
    app.use('/api', router);
    console.log('[Server] API routes mounted at /api');

    // Handle static files and SPA routing
    const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');
    console.log('[Server] Client dist path:', clientDistPath);

    // Serve static files from the client build directory if it exists
    try {
      const distStats = await fs.promises.stat(clientDistPath);
      if (distStats.isDirectory()) {
        app.use(express.static(clientDistPath));
        console.log('[Server] Serving static files from:', clientDistPath);
      } else {
        console.warn('[Server] Client dist path exists but is not a directory');
      }
    } catch (error) {
      console.warn('[Server] Client dist directory not found - development mode assumed');
    }

    // SPA fallback - this must come after API routes
    app.get('*', (req, res, next) => {
      // Don't handle /api routes here
      if (req.path.startsWith('/api/')) {
        return next();
      }

      // Try to send index.html for SPA routes
      const indexPath = path.join(clientDistPath, 'index.html');
      fs.promises.access(indexPath)
        .then(() => res.sendFile(indexPath))
        .catch(() => {
          // In development, respond with a message instead of 404
          if (process.env.NODE_ENV === 'development') {
            res.send('Client app is not built yet. Please run the build command first.');
          } else {
            next(); // Let the 404 handler deal with it
          }
        });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        path: req.path
      });
    });

    // Error handling middleware - should be last
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[Server] Error:', err);
      res.status(err.status || 500).json({ 
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
      });
    });

    const port = parseInt(process.env.PORT || '3001', 10);
    app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});