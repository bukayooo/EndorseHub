import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type User } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Setup authentication middleware and routes
export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "development-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: THIRTY_DAYS,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: THIRTY_DAYS,
      },
    })
  );

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Incorrect email." });
          }

          const isMatch = await crypto.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect password." });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Serialize user for the session
  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

// Express middleware to check if user is authenticated
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
};

// Helper function to hash passwords
export const hashPassword = crypto.hash;

// Helper function to compare passwords
export const comparePassword = crypto.compare;


//Rewritten routes using requireAuth middleware
import { RequestHandler } from 'express';
import { insertUserSchema } from '@db/schema';

const registerRoute: RequestHandler = async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid input",
          message: result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { email, password, marketingEmails = true } = result.data;

      // Check if email is already registered
      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail) {
        return res.status(400).send("Email already registered");
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          marketingEmails,
          isPremium: false
        })
        .returning();

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            email: newUser.email,
            isPremium: newUser.isPremium,
            marketingEmails: newUser.marketingEmails
          }
        });
      });
    } catch (error) {
      next(error);
    }
  };

const loginRoute: RequestHandler = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid input",
        message: result.error.issues.map(i => i.message).join(", ")
      });
    }

    const cb = (err: any, user: User | false, info: any) => { //Improved type for user
      if (err) {
        return res.status(500).json({ error: "Internal server error", details: err.message });
      }

      if (!user) {
        return res.status(400).json({ 
          error: "Authentication failed",
          message: info?.message ?? "Invalid credentials"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ 
            error: "Login session failed", 
            details: err.message 
          });
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            isPremium: user.isPremium
          }
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  };

const logoutRoute: RequestHandler = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ 
          error: "Logout failed",
          message: err.message || "An error occurred during logout"
        });
      }

      res.json({ message: "Logout successful" });
    });
  };

const userRoute: RequestHandler = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    return res.status(401).json({ 
      error: "Authentication required",
      message: "Not logged in" 
    });
  };


export function setupRoutes(app: Express){
    app.post("/api/register", registerRoute);
    app.post("/api/login", loginRoute);
    app.post("/api/logout", logoutRoute);
    app.get("/api/user", requireAuth, userRoute);
}