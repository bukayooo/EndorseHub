import { Router } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Configure Passport's Local Strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return done(null, false, { message: 'Incorrect password.' });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Serialize user for the session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export async function setupAuth(router: Router) {
  const loginRoute = passport.authenticate('local');

  const registerRoute = async (req: any, res: any) => {
    try {
      const { username, password } = req.body;
      
      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username)
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [user] = await db.insert(users).values({
        username,
        password: hashedPassword,
        createdAt: new Date()
      }).returning();

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  const logoutRoute = (req: any, res: any) => {
    req.logout();
    res.json({ success: true });
  };

  const userRoute = (req: any, res: any) => {
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