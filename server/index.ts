import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuthRoutes } from './routes/auth.routes.js';
import { setupTestimonialRoutes } from './routes/testimonial.routes.js';
import { setupAnalyticsRoutes } from './routes/analytics.routes.js';
import { setupStripeRoutes } from './routes/stripe.routes.js';
import config from './config.js';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
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
    /^https:\/\/.*\.worf\.replit\.dev(:\d+)?$/  // Allow Replit development URLs
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

      console.log('[CORS] Checking origin:', origin);

      // Check if the origin is allowed
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        }
        // For RegExp, test the origin
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
    exposedHeaders: ['Set-Cookie']
  };

  // Basic middleware
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session setup
  const MemoryStoreSession = MemoryStore(session);
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'development_secret_key',
    name: 'testimonial.sid',
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    })
  };

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Debug middleware
  app.use((req, res, next) => {
    console.log('[API] Request:', {
      method: req.method,
      url: req.url,
      body: req.body,
      user: req.user?.id,
      session: req.sessionID,
      isAuthenticated: req.isAuthenticated()
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
  setupStripeRoutes(router);

  // Mount API routes
  app.use('/api', router);
  
  // Serve static files
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Server] Error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  });

  // Start server
  const port = process.env.PORT || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Running at http://0.0.0.0:${port}`);
  });
}

startServer().catch(error => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});