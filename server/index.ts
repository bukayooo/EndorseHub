import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { localStrategy } from './auth/index';
import { findUserById } from './db';
import type { User } from './db/schema';

// Import routes
import authRoutes from './routes/auth.js';
import testimonialRoutes from './routes/testimonials.js';
import widgetRoutes from './routes/widgets.js';
import analyticsRoutes from './routes/analytics.js';
import stripeRoutes from './routes/stripe.js';

const app = express();
const port = process.env.PORT || 3000;

// Trust proxy setup for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
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
app.use(passport.initialize());
app.use(passport.session());
passport.use(localStrategy);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stripe', stripeRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});