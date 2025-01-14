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

  const app = express();

  // Configure CORS for all routes
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Always allow Stripe webhooks
      if (!origin || origin === 'https://api.stripe.com') {
        return callback(null, true);
      }

      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        new RegExp('^https://.*\\.replit\\.dev$'),
        'https://endorsehub.com',
        'https://endorsehub.replit.app'
      ];

      if (process.env.CLIENT_URL) {
        allowedOrigins.push(process.env.CLIENT_URL);
      }

      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        }
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
    maxAge: 86400
  };

  app.use(cors(corsOptions));

  // Special handling for Stripe webhook route - must be before other middleware
  app.post('/stripe-webhook', 
    express.raw({type: 'application/json', verify: (req: express.Request, res: express.Response, buf: Buffer) => {
      if (req.originalUrl === '/stripe-webhook') {
        (req as any).rawBody = buf;
      }
    }}),
    async (request: Request, response: Response) => {
      const sig = request.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: Stripe.Event;

      try {
        if (!sig || !endpointSecret) {
          throw new Error('Missing signature or webhook secret');
        }

        // Log raw body details for debugging
        console.log('[Stripe Webhook] Raw body type:', typeof (request as any).rawBody);
        console.log('[Stripe Webhook] Raw body length:', (request as any).rawBody?.length);
        console.log('[Stripe Webhook] Signature:', sig);

        event = stripe.webhooks.constructEvent((request as any).rawBody, sig, endpointSecret);
      } catch (err) {
        console.error('[Stripe Webhook] Error:', err);
        response.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return;
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = parseInt(session.metadata?.userId || '');
            
            if (!userId) {
              throw new Error('Missing userId in metadata');
            }

            if (!session.subscription || typeof session.subscription !== 'string') {
              throw new Error('Missing or invalid subscription ID');
            }

            if (!session.customer || typeof session.customer !== 'string') {
              throw new Error('Missing or invalid customer ID');
            }

            const subscription = await stripe.subscriptions.retrieve(session.subscription);

            await db.update(users)
              .set({
                is_premium: true,
                stripe_customer_id: session.customer,
                stripeSubscriptionId: subscription.id
              })
              .where(eq(users.id, userId));

            console.log('[Stripe Webhook] Updated user premium status:', { userId });
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            const customer = subscription.customer as string;

            await db.update(users)
              .set({
                is_premium: false,
                stripeSubscriptionId: null
              })
              .where(eq(users.stripe_customer_id, customer));

            console.log('[Stripe Webhook] Revoked user premium status');
            break;
          }

          default: {
            console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
          }
        }

        response.send();
      } catch (err) {
        console.error('[Stripe Webhook] Error processing event:', err);
        response.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
  });

  // Regular middleware for other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    app.enable('trust proxy');
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport's Local Strategy
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);
      
      const user = result[0];

      if (!user) {
        return done(null, false, { message: 'Invalid email or password.' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Invalid email or password.' });
      }

      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!result[0]) {
        return done(null, false);
      }
      
      const { password: _, ...userWithoutPassword } = result[0];
      done(null, userWithoutPassword);
    } catch (err) {
      done(err);
    }
  });

  // API routes
  console.log('[Server] Setting up API routes...');
  const apiRouter = express.Router();

  setupAuthRoutes(apiRouter);
  setupTestimonialRoutes(apiRouter);
  setupAnalyticsRoutes(apiRouter);
  setupStripeRoutes(apiRouter);
  setupWidgetRoutes(apiRouter);
  setupStatsRoutes(apiRouter);

  app.use('/api', apiRouter);

  // Serve static files
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  // SPA fallback
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        success: false, 
        error: 'API endpoint not found' 
      });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer().catch(error => {
  console.error('[Server] Fatal startup error:', error);
  process.exit(1);
});