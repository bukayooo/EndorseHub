import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuthRoutes } from './routes/auth.routes';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';
import { setupStripeRoutes } from './routes/stripe.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import { setupStatsRoutes } from './routes/stats.routes';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db, setupDb } from "./db";
import { users } from "@db/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm/sql";
import { handleWebhook } from './stripe';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
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

  // Configure CORS
  const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:3001',
      'http://0.0.0.0:5173',
      'http://0.0.0.0:3001',
      'http://172.31.196.3:5173',
      'http://172.31.196.62:5173',
      'http://172.31.196.85:5173',
      'http://172.31.196.5:5173',
      'https://endorsehub.replit.app',
      'https://endorsehub.com',
      'https://www.endorsehub.com',
      /\.replit\.dev$/,
      /\.replit\.app$/,
      /^https?:\/\/.*\.worf\.replit\.dev(:\d+)?$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'stripe-signature'],
    exposedHeaders: ['Set-Cookie']
  };

  if (process.env.CLIENT_URL) {
    corsOptions.origin.push(process.env.CLIENT_URL);
  }

  // Stripe webhook endpoint must come before ANY body parsers
  app.post(
    '/api/billing/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];

      console.log('[Stripe Webhook] Request details:', {
        hasSignature: !!signature,
        contentType: req.headers['content-type'],
        bodyIsBuffer: Buffer.isBuffer(req.body),
        bodyLength: req.body?.length
      });

      try {
        await handleWebhook(req, res);
      } catch (error) {
        console.error('[Stripe Webhook] Error:', error);
        return res.status(400).json({ 
          error: 'Webhook error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // CORS and other middleware come after webhook endpoint
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));


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

  // Session store setup
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    }
  };

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Debug middleware
  app.use((req, res, next) => {
    if (!req.path.includes('/api/billing/webhook')) {
      console.log('[Server] Request:', {
        method: req.method,
        path: req.path,
        origin: req.get('origin'),
        authenticated: req.isAuthenticated(),
        userId: req.user?.id,
        sessionId: req.session?.id
      });
    }
    next();
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
  console.log('[Server] API routes mounted at /api');

  // Static files and SPA fallback
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  const port = parseInt(process.env.PORT || '3001', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch(error => {
  console.error('[Server] Fatal startup error:', error);
  process.exit(1);
});