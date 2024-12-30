import { Router } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db, eq } from "../../db";
import { users } from "../../db/schema";
import type { User, NewUser } from "../../db/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      username: string;
      isPremium: boolean;
      stripeCustomerId: string | null;
      createdAt: Date;
      marketingEmails: boolean;
      keepMeLoggedIn: boolean;
    }
  }
}

// Configure Passport's Local Strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    const user = result[0];

    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return done(null, false, { message: 'Incorrect password.' });
    }

    // Remove password from user object before serializing
    const { password: _, ...userWithoutPassword } = user;
    return done(null, userWithoutPassword);
  } catch (err) {
    return done(err);
  }
}));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        isPremium: users.isPremium,
        stripeCustomerId: users.stripeCustomerId,
        createdAt: users.createdAt,
        marketingEmails: users.marketingEmails,
        keepMeLoggedIn: users.keepMeLoggedIn
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    done(null, result[0]);
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
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser[0]) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email: `${username}@example.com`, // Temporary email
          isPremium: false,
          stripeCustomerId: null,
          marketingEmails: true,
          keepMeLoggedIn: false
        } as NewUser)
        .returning();

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        data: userWithoutPassword
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
    req.logout(() => {
      res.json({ success: true });
    });
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

export async function findUserById(id: number): Promise<Omit<User, 'password'> | undefined> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      isPremium: users.isPremium,
      stripeCustomerId: users.stripeCustomerId,
      createdAt: users.createdAt,
      marketingEmails: users.marketingEmails,
      keepMeLoggedIn: users.keepMeLoggedIn
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0];
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
}

export async function createUser(data: {
  email: string;
  password: string;
  username?: string;
}): Promise<Omit<User, 'password'>> {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      password: hashedPassword,
      username: data.username,
      isPremium: false,
      stripeCustomerId: null,
      marketingEmails: true,
      keepMeLoggedIn: false
    } as NewUser)
    .returning();
  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function updateUser(id: number, data: Partial<Omit<User, 'password'>>): Promise<Omit<User, 'password'> | undefined> {
  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  
  if (!user) return undefined;
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function deleteUser(id: number): Promise<void> {
  await db
    .delete(users)
    .where(eq(users.id, id));
}

export async function validatePassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
} 