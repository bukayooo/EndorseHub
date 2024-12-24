import { RequestHandler } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

type DatabaseUser = {
  id: number;
  email: string;
  password?: string;
  isPremium: boolean | null;
  createdAt: Date | null;
  stripeCustomerId?: string | null;
  marketingEmails?: boolean | null;
  keepMeLoggedIn?: boolean | null;
  username?: string | null;
};

type SafeUser = {
  id: number;
  email: string;
  isPremium: boolean;
  createdAt: Date;
};

type User = SafeUser;

declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

function mapToSafeUser(dbUser: DatabaseUser): SafeUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    isPremium: dbUser.isPremium || false,
    createdAt: dbUser.createdAt || new Date()
  };
}

export async function setupAuth(app: any) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'development_secret_key',
    name: 'testimonial.sid',
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
      stale: false
    }),
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport strategy
  passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: false
  }, async (email, password, done) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[Auth] Login attempt:', { email: normalizedEmail });
      
      const [dbUser] = await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          isPremium: users.isPremium,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!dbUser) {
        console.error('[Auth] User not found:', normalizedEmail);
        return done(null, false, { message: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, dbUser.password);
      if (!isPasswordValid) {
        console.error('[Auth] Invalid password for user:', dbUser.id);
        return done(null, false, { message: 'Invalid credentials' });
      }

      const safeUser = mapToSafeUser(dbUser);
      
      console.log('[Auth] Authentication successful:', { id: safeUser.id, email: safeUser.email });
      return done(null, safeUser);
    } catch (err) {
      console.error('[Auth] Authentication error:', err);
      return done(err);
    }
  }));

  passport.serializeUser((user: Express.User, done) => {
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
        return done(null, false);
      }

      done(null, mapToSafeUser(user));
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err);
    }
  });

  const loginRoute: RequestHandler = async (req, res, next) => {
    try {
      if (!req.body.email || !req.body.password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      console.log('[Auth] Login request received:', { 
        email: req.body.email,
        sessionID: req.sessionID
      });

      passport.authenticate('local', (err: Error, user: SafeUser | false, info: any) => {
        if (err) {
          console.error('[Auth] Authentication error:', err);
          return res.status(500).json({
            success: false,
            error: 'Authentication failed'
          });
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
            return res.status(500).json({
              success: false,
              error: 'Login failed'
            });
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
          isPremium: false,
          createdAt: new Date()
        })
        .returning();

      const safeUser = mapToSafeUser(user);

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

  const logoutRoute: RequestHandler = (req, res) => {
    const userId = req.user?.id;
    console.log('[Auth] Logout request received:', { userId });
    
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Logout failed' 
        });
      }
      
      res.json({ success: true });
    });
  };

  const userRoute: RequestHandler = (req, res) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    res.json({ 
      success: true, 
      data: req.user 
    });
  };

  return {
    loginRoute,
    registerRoute,
    logoutRoute,
    userRoute
  };
}