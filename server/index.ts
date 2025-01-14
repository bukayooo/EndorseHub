import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuthRoutes } from './routes/auth.routes';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';
import { setupStripeRoutes } from './routes/stripe.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import { setupStatsRoutes } from './routes/stats.routes';
import { stripe } from './stripe';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db, setupDb } from "./db";
import { users } from "@db/schema";
import { sql, eq } from "drizzle-orm";
import type { Stripe } from 'stripe';

// Extend Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize database and run migrations before any server setup
  try {
    console.log('[Server] Setting up database...');
    await setupDb();
    console.log('[Server] Database setup completed successfully');
  } catch (error) {
    console.error('[Server] Database setup failed:', error);
    console.error('[Server] Cannot proceed with server startup due to database initialization failure');
    process.exit(1);
  }

  // Only proceed with server setup if database initialization was successful
  const app = express();

  // Configure Passport's Local Strategy
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      console.log('[Passport] Authenticating user:', { email });
      const result = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);
      
      const user = result[0];

      if (!user) {
        console.log('[Passport] User not found:', { email });
        return done(null, false, { message: 'Invalid email or password.' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log('[Passport] Invalid password:', { email });
        return done(null, false, { message: 'Invalid email or password.' });
      }

      // Remove password from user object before serializing
      const { password: _, ...userWithoutPassword } = user;
      console.log('[Passport] Authentication successful:', { userId: user.id });
      return done(null, userWithoutPassword);
    } catch (err) {
      console.error('[Passport] Authentication error:', err);
      return done(err);
    }
  }));

  // Serialize user for the session
  passport.serializeUser((user: any, done) => {
    console.log('[Passport] Serializing user:', { userId: user.id });
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Passport] Deserializing user:', { userId: id });
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!result[0]) {
        console.log('[Passport] User not found during deserialization:', { userId: id });
        return done(null, false);
      }
      
      // Remove password before returning
      const { password: _, ...userWithoutPassword } = result[0];
      console.log('[Passport] User deserialized successfully:', { userId: id });
      done(null, userWithoutPassword);
    } catch (err) {
      console.error('[Passport] Deserialization error:', err);
      done(err);
    }
  });

  // Stripe webhook route - must be before any body parsing middleware
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      console.log('[Stripe Webhook] Request received:', {
        path: req.path,
        method: req.method,
        hasSignature: !!sig,
        contentType: req.headers['content-type'],
        bodyType: typeof req.body,
        bodyLength: req.body?.length,
        isBuffer: Buffer.isBuffer(req.body)
      });

      if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('[Stripe Webhook] Missing signature or webhook secret');
        return res.status(400).json({ error: 'Missing signature or webhook secret' });
      }

      if (!Buffer.isBuffer(req.body)) {
        console.error('[Stripe Webhook] Request body is not a buffer');
        return res.status(400).json({ error: 'Invalid request body format' });
      }

      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log('[Stripe Webhook] Event constructed successfully:', {
        type: event.type,
        id: event.id
      });

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = parseInt(session.metadata?.userId || '');
          
          if (!userId) {
            console.error('[Stripe Webhook] Missing userId in session metadata', session.metadata);
            return res.status(400).json({ error: 'Missing userId in session metadata' });
          }

          console.log('[Stripe Webhook] Processing completed checkout:', {
            userId,
            customerId: session.customer,
            subscriptionId: session.subscription,
            metadata: session.metadata
          });

          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          await db.update(users)
            .set({
              is_premium: true,
              stripe_customer_id: session.customer as string,
              stripeSubscriptionId: subscription.id
            })
            .where(eq(users.id, userId));

          console.log('[Stripe Webhook] User premium status updated successfully');
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = subscription.customer as string;
          
          console.log('[Stripe Webhook] Processing subscription deletion:', {
            customer,
            subscriptionId: subscription.id
          });

          await db.update(users)
            .set({
              is_premium: false,
              stripeSubscriptionId: null
            })
            .where(eq(users.stripe_customer_id, customer));

          console.log('[Stripe Webhook] User premium status revoked successfully');
          break;
        }

        default: {
          console.log('[Stripe Webhook] Unhandled event type:', event.type);
        }
      }

      return res.json({ received: true });
    } catch (error) {
      console.error('[Stripe Webhook] Error processing webhook:', error);
      return res.status(400).json({ 
        error: 'Webhook error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Configure CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    new RegExp('^https://.*\\.replit\\.dev$'),
    'https://endorsehub.com',
    'https://endorsehub.replit.app',
    'https://api.stripe.com'
  ];

  // Add CLIENT_URL if it exists
  if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
  }

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
      if (!origin || origin === 'https://api.stripe.com') {
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
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'stripe-signature'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400 // 24 hours in seconds
  };

  // Configure middleware for all non-webhook routes
  app.use((req, res, next) => {
    // Skip all middleware for webhook route
    if (req.originalUrl === '/api/billing/webhook') {
      return next();
    }

    // Apply middleware for non-webhook routes
    cors(corsOptions)(req, res, (err) => {
      if (err) return next(err);
      express.json()(req, res, (err) => {
        if (err) return next(err);
        express.urlencoded({ extended: true })(req, res, next);
      });
    });
  });

  // Session setup
  const MemoryStoreSession = MemoryStore(session);
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'testimonial.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new MemoryStoreSession({
      checkPeriod: 86400000
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
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

  // Debug middleware for all requests
  app.use((req, res, next) => {
    console.log('[Server] Request:', {
      method: req.method,
      path: req.path,
      origin: req.get('origin'),
      authenticated: req.isAuthenticated(),
      userId: req.user?.id,
      sessionId: req.session?.id,
      body: req.path.includes('password') ? '[REDACTED]' : req.body // Log body except for password
    });
    next();
  });

  // API routes
  console.log('[Server] Setting up API routes...');
  const apiRouter = express.Router();

  // Create a new router for other API routes
  setupAuthRoutes(apiRouter);
  setupTestimonialRoutes(apiRouter);
  setupAnalyticsRoutes(apiRouter);
  setupStripeRoutes(apiRouter);
  setupWidgetRoutes(apiRouter);
  setupStatsRoutes(apiRouter);

  // Mount other API routes
  app.use('/api', apiRouter);
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

// Improve error handling in the main startup function
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer().catch(error => {
  console.error('[Server] Fatal startup error:', error);
  process.exit(1);
});