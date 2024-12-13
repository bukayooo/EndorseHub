import { RequestHandler } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy as LocalStrategy } from 'passport-local';
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
};

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

function mapToSafeUser(dbUser: DatabaseUser): SafeUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    isPremium: dbUser.isPremium || false,
    createdAt: dbUser.createdAt || new Date()
  };
}

export async function setupAuth(app: any) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      done(null, mapToSafeUser(user));
    } catch (err) {
      done(err);
    }
  });

  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password!);
      if (!isValid) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      return done(null, mapToSafeUser(user));
    } catch (err) {
      return done(err);
    }
  }));

  const loginRoute: RequestHandler = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Authentication failed' });
      }
      if (!user) {
        return res.status(401).json({ success: false, error: info?.message || 'Invalid credentials' });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ success: false, error: 'Login failed' });
        }
        return res.json({ success: true, data: user });
      });
    })(req, res, next);
  };

  const registerRoute: RequestHandler = async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
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
          return res.status(500).json({ success: false, error: 'Registration successful but login failed' });
        }
        return res.json({ success: true, data: safeUser });
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Registration failed' });
    }
  };

  const logoutRoute: RequestHandler = (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  };

  const userRoute: RequestHandler = (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    res.json({ success: true, data: req.user });
  };

  return { loginRoute, registerRoute, logoutRoute, userRoute };
}