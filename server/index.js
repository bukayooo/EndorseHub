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
    // Initialize database and run migrations before any server setup
    try {
        console.log('[Server] Setting up database...');
        await setupDb();
        console.log('[Server] Database setup completed successfully');
    }
    catch (error) {
        console.error('[Server] Database setup failed:', error);
        console.error('[Server] Cannot proceed with server startup due to database initialization failure');
        process.exit(1);
    }
    // Only proceed with server setup if database initialization was successful
    const app = express();
    // Stripe webhook needs raw body parsing - must come before ANY middleware that parses the body
    app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
        console.log('[Stripe Webhook] Received webhook request:', {
            path: req.path,
            method: req.method,
            hasSignature: !!req.headers['stripe-signature'],
            contentType: req.headers['content-type'],
            bodyType: typeof req.body,
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
    });
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
                .where(sql `LOWER(${users.email}) = LOWER(${email})`)
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
        }
        catch (err) {
            console.error('[Passport] Authentication error:', err);
            return done(err);
        }
    }));
    // Serialize user for the session
    passport.serializeUser((user, done) => {
        console.log('[Passport] Serializing user:', { userId: user.id });
        done(null, user.id);
    });
    // Deserialize user from the session
    passport.deserializeUser(async (id, done) => {
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
        }
        catch (err) {
            console.error('[Passport] Deserialization error:', err);
            done(err);
        }
    });
    // CORS configuration
    const allowedOrigins = [
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
    ];
    // Add CLIENT_URL if it exists
    if (process.env.CLIENT_URL) {
        allowedOrigins.push(process.env.CLIENT_URL);
    }
    const corsOptions = {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
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
            }
            else {
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
    // Basic middleware
    app.use(cors(corsOptions));
    // Body parsing middleware for all other routes
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Session setup
    const MemoryStoreSession = MemoryStore(session);
    const sessionConfig = {
        secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
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
            sessionId: req.session?.id
        });
        next();
    });
    // API routes
    console.log('[Server] Setting up API routes...');
    const router = express.Router();
    // Setup auth first
    setupAuthRoutes(router);
    // Then other routes
    setupTestimonialRoutes(router);
    setupAnalyticsRoutes(router);
    setupStripeRoutes(router);
    setupWidgetRoutes(router);
    setupStatsRoutes(router);
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
    app.use((err, req, res, next) => {
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
