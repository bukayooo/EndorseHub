import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { localStrategy, initializePassport, initializeSession } from './auth/index';
import { findUserById } from '../db';
import { createApiRouter } from './routes';
const app = express();
const port = process.env.PORT || 3001;
// Trust proxy setup for rate limiting behind reverse proxies
app.set('trust proxy', 1);
// Middleware
app.use(helmet());
// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
    process.env.CLIENT_URL,
];
// Add Replit-specific origins
if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    allowedOrigins.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
}
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Allow any subdomain of replit.dev or replit.app
        if (origin.match(/\.replit\.(dev|app)$/)) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.log('[CORS] Rejected origin:', origin);
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
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
// Mount API routes
app.use('/api', createApiRouter());
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
