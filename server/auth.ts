import { RequestHandler } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

type SafeUser = {
  id: number;
  email: string;
  isPremium: boolean;
  createdAt: Date;
};

declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

export async function setupAuth(app: any) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: SafeUser, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Auth] Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Auth] User not found during deserialization:', id);
        return done(null, false);
      }

      const safeUser: SafeUser = {
        id: user.id,
        email: user.email,
        isPremium: user.is_premium || false,
        createdAt: user.created_at || new Date()
      };

      console.log('[Auth] User deserialized successfully:', safeUser.id);
      done(null, safeUser);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err, null);
    }
  });

  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      console.log('[Auth] Login attempt:', email);
      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      
      if (!user) {
        console.log('[Auth] No user found:', normalizedEmail);
        return done(null, false, { message: 'Invalid credentials' });
      }

      console.log('[Auth] Found user:', user.id);
      
      try {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          console.log('[Auth] Invalid password for user:', user.id);
          return done(null, false, { message: 'Invalid credentials' });
        }

        console.log('[Auth] Password verified for user:', user.id);
        const safeUser: SafeUser = {
          id: user.id,
          email: user.email,
          isPremium: user.is_premium || false,
          createdAt: user.created_at || new Date()
        };
        return done(null, safeUser);
      } catch (bcryptError) {
        console.error('[Auth] Password comparison error:', bcryptError);
        return done(null, false, { message: 'Invalid credentials' });
      }
    } catch (err) {
      console.error('[Auth] Strategy error:', err);
      return done(err);
    }
  }));
}

const registerRoute: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already registered' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        password: hashedPassword,
        is_premium: false,
        created_at: new Date(),
        marketing_emails: false,
        keep_me_logged_in: false
      })
      .returning();

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      isPremium: user.is_premium || false,
      createdAt: user.created_at || new Date()
    };

    req.login(safeUser, (err) => {
      if (err) {
        console.error('[Auth] Login after registration failed:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Registration successful but login failed' 
        });
      }
      return res.json({ 
        success: true, 
        data: safeUser 
      });
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Registration failed' 
    });
  }
};

const loginRoute: RequestHandler = async (req, res, next) => {
  try {
    console.log('[Auth] Login request received:', { 
      email: req.body.email,
      sessionID: req.sessionID
    });

    return passport.authenticate('local', (err: Error, user: SafeUser | false, info: any) => {
      if (err) {
        console.error('[Auth] Authentication error:', err);
        return next(err);
      }

      if (!user) {
        console.log('[Auth] Authentication failed:', info?.message);
        return res.status(401).json({ 
          success: false, 
          error: info?.message || 'Invalid credentials'
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('[Auth] Login error:', loginErr);
          return next(loginErr);
        }

        console.log('[Auth] Login successful:', user.id);
        return res.json({
          success: true,
          data: user
        });
      });
    })(req, res, next);
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    });
  }
};

const logoutRoute: RequestHandler = (req, res) => {
  const userId = req.user?.id;
  req.logout((err) => {
    if (err) {
      console.error('[Auth] Logout failed for user:', userId, err);
      return res.status(500).json({ 
        success: false, 
        error: 'Logout failed' 
      });
    }
    console.log('[Auth] Logout successful for user:', userId);
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
};

const userRoute: RequestHandler = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    });
  }
  return res.json({ 
    success: true, 
    data: req.user 
  });
};

export const authRoutes = {
  registerRoute,
  loginRoute,
  logoutRoute,
  userRoute
};