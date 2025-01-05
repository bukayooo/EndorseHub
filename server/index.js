import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { localStrategy, initializePassport, initializeSession } from './auth/index';
import { findUserById } from '../db';
import { createApiRouter } from './routes';
const app = express();
const isDev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT) || 3001;
// Get the internal network IP for Replit
const internalIP = process.env.REPL_SLUG ? '172.31.196.59' : 'localhost';
// Trust proxy setup for rate limiting behind reverse proxies
app.set('trust proxy', 1);
// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
}));
// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:80',
    'https://endorsehub.com'
];
// Add Replit-specific origins
if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const replitDomain = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const replitDevDomain = `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.worf.replit.dev`;
    allowedOrigins.push(replitDomain, replitDevDomain);
    console.log('[CORS] Added Replit domains:', { replitDomain, replitDevDomain });
}
app.use(cors({
    origin: function (origin, callback) {
        console.log('[CORS] Request from origin:', origin);
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('[CORS] Allowing request with no origin');
            return callback(null, true);
        }
        // Check if the origin is allowed
        const isAllowed = allowedOrigins.some(allowed => origin === allowed ||
            origin.endsWith('.replit.dev') ||
            origin.endsWith('.repl.co') ||
            origin.endsWith('endorsehub.com'));
        if (isAllowed) {
            console.log('[CORS] Allowing origin:', origin);
            return callback(null, true);
        }
        console.log('[CORS] Rejected origin:', origin);
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
}));
// Rate limiting
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
}));
// Passport setup
app.use(initializePassport());
app.use(initializeSession());
passport.use(localStrategy);
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await findUserById(id);
        done(null, user);
    }
    catch (error) {
        done(error);
    }
});
// API routes
const apiRouter = createApiRouter();
app.use('/api', apiRouter);
// In production, serve static files
if (!isDev) {
    const clientDistPath = path.join(process.cwd(), 'dist', 'client');
    if (fs.existsSync(clientDistPath)) {
        console.log('[Server] Serving static files from:', clientDistPath);
        // Serve static files
        app.use(express.static(clientDistPath, {
            index: false // Don't serve index.html for directory requests
        }));
        // SPA fallback - serve index.html for all non-API routes
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api/')) {
                console.log('[Server] Serving SPA fallback for:', req.path);
                res.sendFile(path.join(clientDistPath, 'index.html'));
            }
        });
        console.log('[Server] Static file serving configured');
    }
    else {
        console.error('[Server] Client dist path not found:', clientDistPath);
    }
}
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
