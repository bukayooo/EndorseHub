import * as dotenv from 'dotenv';
dotenv.config();

// Force NODE_ENV to production in production builds
if (process.env.REPLIT_DEPLOYMENT_ID) {
  process.env.NODE_ENV = 'production';
}

// Validate critical environment variables
const REQUIRED_ENV_VARS = ['STRIPE_WEBHOOK_SECRET'];
const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('[Server] Missing required environment variables:', missingVars);
  process.exit(1);
}

import express, { Express, Request, Response, NextFunction } from 'express';
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
import http from 'http';

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

  // Log environment configuration at startup
  console.log('[Server] Environment configuration:', {
    nodeEnv: process.env.NODE_ENV,
    webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 6),
    webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    port: process.env.PORT,
    isProduction: process.env.NODE_ENV === 'production',
    deploymentId: process.env.REPLIT_DEPLOYMENT_ID,
    envVars: Object.keys(process.env).filter(key => !key.includes('SECRET')).join(', ')
  });

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Server] ERROR: STRIPE_WEBHOOK_SECRET is not set! This will cause webhook verification to fail.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Exit in production if webhook secret is missing
    }
  }

  const app: Express = express();

  // Create a raw http server to handle the webhook outside of Express middleware
  const rawServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/stripe-webhook') {
      // Collect raw bytes without any encoding transformation
      const chunks: Buffer[] = [];
      
      req.on('data', (chunk: Buffer) => {
        // Node.js HTTP module always provides Buffer chunks when no encoding is set
        chunks.push(chunk);
      });

      req.on('end', async () => {
        try {
          // Combine chunks without any transformation
          const rawBody = Buffer.concat(chunks);
          const sig = req.headers['stripe-signature'] as string;
          const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

          if (!sig || !endpointSecret) {
            console.error('[Stripe Webhook] Missing required values:', {
              hasSignature: !!sig,
              hasSecret: !!endpointSecret,
              secretLength: endpointSecret?.length,
              signatureLength: sig?.length
            });
            res.writeHead(400);
            res.end('Missing signature or webhook secret');
            return;
          }

          // Log signature format but not the full values
          console.log('[Stripe Webhook] Header format:', {
            sigPrefix: sig.substring(0, 2),
            secretPrefix: endpointSecret.substring(0, 6),
            sigParts: sig.split(',').length
          });

          // Don't log the raw body - it could cause stringification
          console.log('[Stripe Webhook] Received request:', {
            contentLength: req.headers['content-length'],
            hasSignature: !!sig,
            bodyLength: rawBody.length,
            isBuffer: Buffer.isBuffer(rawBody),
            signatureLength: sig.length,
            secretLength: endpointSecret.length
          });

          let event: Stripe.Event;
          try {
            event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
          } catch (err) {
            console.error('[Stripe Webhook] Signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
            res.writeHead(400);
            res.end();
            return;
          }

          console.log('[Stripe Webhook] Signature verified, processing event:', event.type);

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

          // Send response without any body to avoid any possible transformation
          res.writeHead(200);
          res.end();
        } catch (err) {
          console.error('[Stripe Webhook] Processing error:', err instanceof Error ? err.message : 'Unknown error');
          res.writeHead(400);
          res.end();
        }
      });

      req.on('error', (err) => {
        console.error('[Stripe Webhook] Request error:', err instanceof Error ? err.message : 'Unknown error');
        res.writeHead(400);
        res.end();
      });
    } else {
      // Forward all other requests to Express
      (app as any).handle(req, res);
    }
  });

  // Configure CORS for all other routes
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
  rawServer.listen(port, '0.0.0.0', () => {
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