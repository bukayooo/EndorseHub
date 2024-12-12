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
  app.use(passport.initialize());
  app.use(passport.session());

  // Clear existing session if any
  app.use((req, res, next) => {
    if (req.path === '/api/login' && req.method === 'POST') {
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        next();
      });
    } else {
      next();
    }
  });

  passport.serializeUser((user: any, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Auth] Deserializing user:', id);
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          isPremium: users.isPremium,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Auth] User not found during deserialization:', id);
        return done(null, false);
      }

      console.log('[Auth] User deserialized successfully:', user.id);
      done(null, user);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err, null);
    }
  });

  passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail));
      
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        isPremium: user.isPremium,
        createdAt: user.createdAt
      };
      return done(null, safeUser);
    } catch (err) {
      return done(err);
    }
  }));
}

const registerRoute: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
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

const loginRoute: RequestHandler = async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('[Auth] Login attempt:', { email, sessionID: req.sessionID });
      
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => {
          if (err) {
            console.error('Login error:', err);
            reject(err);
          }
          resolve();
        });
      });

      console.log('[Auth] Login successful for user:', user.id);
      const safeUser = {
        id: user.id,
        email: user.email,
        isPremium: user.isPremium,
        createdAt: user.createdAt
      };

      return res.json({ success: true, data: safeUser });
    } catch (error) {
      console.error('[Auth] Unexpected login error:', error);
      return res.status(500).json({ success: false, error: 'Unexpected login error' });
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