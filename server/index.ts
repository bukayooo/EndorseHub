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

  // Serve static files from the client build directory
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  // SPA fallback - this must come after API routes
  app.get('*', (req, res) => {
    // Don't handle /api routes here
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        success: false, 
        error: 'API endpoint not found' 
      });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // Error handling middleware - should be last
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Server] Error:', err);
    res.status(err.status || 500).json({ 
      success: false,
      error: err.message || 'Internal Server Error'
    });
  });

  const port = parseInt(process.env.PORT || '3001', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch(error => {
  console.error('[Server] Startup error:', error);
});