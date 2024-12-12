import { RequestHandler } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function setupAuth(app: any) {
  // Setup session middleware first
  const MemoryStore = createMemoryStore(session);
  app.use(session({
    name: 'testimonial-session',
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      
      // Hash and compare passwords
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

const registerRoute: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const [user] = await db.insert(users).values({
      email,
      password: await bcrypt.hash(password, 10),
      isPremium: false,
      createdAt: new Date()
    }).returning();

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Login after registration failed' });
      }
      res.json({ success: true, data: user });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const loginRoute: RequestHandler = async (req, res, next) => {
  passport.authenticate('local', (err: Error | null, user: Express.User | false, info: any) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: 'Login failed' });
    }
    
    if (!user) {
      return res.status(401).json({ success: false, error: info?.message || 'Invalid credentials' });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.status(500).json({ success: false, error: 'Login failed' });
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        isPremium: user.isPremium,
        createdAt: user.createdAt
      };

      return res.json({ success: true, data: safeUser });
    });
  })(req, res, next);
};

const logoutRoute: RequestHandler = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
};

const userRoute: RequestHandler = (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as Express.User;
    const safeUser = {
      id: user.id,
      email: user.email,
      isPremium: user.isPremium,
      createdAt: user.createdAt
    };
    return res.json({ success: true, data: safeUser });
  }
  res.status(401).json({ error: 'Not authenticated' });
};

export const authRoutes = {
  registerRoute,
  loginRoute,
  logoutRoute,
  userRoute
};
