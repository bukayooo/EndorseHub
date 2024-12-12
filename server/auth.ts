import { RequestHandler } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function setupAuth(app: any) {
  // Setup session middleware first
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production'
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

  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      isPremium: false
    }).returning();

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Login after registration failed' });
      }
      res.json({ success: true, data: user });
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

const loginRoute: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    return new Promise((resolve) => {
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Login failed' });
        }
        res.json({ success: true, data: user });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
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
    return res.json(req.user);
  }
  res.status(401).json({ error: 'Not authenticated' });
};

export const authRoutes = {
  registerRoute,
  loginRoute,
  logoutRoute,
  userRoute
};