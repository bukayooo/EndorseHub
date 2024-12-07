import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "@db/schema";
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

// extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...sessionSettings.cookie,
      secure: true,
      sameSite: 'none'
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
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
        console.error("Authentication error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation error",
          message: result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { email, password, marketingEmails = true, keepMeLoggedIn = false } = result.data;
        
      const newUser = await db.transaction(async (tx) => {
        const [existingUser] = await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          throw new Error("Email already registered");
        }

        const hashedPassword = await crypto.hash(password);
        const [user] = await tx
          .insert(users)
          .values({
            email,
            password: hashedPassword,
            marketingEmails,
            keepMeLoggedIn
          })
          .returning();

        return user;
      });

      // Login after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({ 
            error: "Login failed",
            message: err.message 
          });
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
    } catch (error: any) {
      console.error("Registration error:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      });

      // Handle specific database errors
      if (error.code === '23505' && error.detail?.includes('email')) {
        return res.status(400).json({ 
          error: "Registration failed",
          message: "Email already registered"
        });
      } else if (error.code === '42703') { // undefined_column
        return res.status(500).json({ 
          error: "Registration failed",
          message: "Database schema error. Please contact support."
        });
      } else if (error.message === "Email already registered") {
        return res.status(400).json({ 
          error: "Registration failed",
          message: error.message 
        });
      }

      // Log the full error for debugging
      console.error("Unexpected registration error:", error);
      
      res.status(500).json({ 
        error: "Registration failed",
        message: "An unexpected error occurred. Please try again later."
      });
    }
  });

  app.post("/api/login", (req, res) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation error",
        message: result.error.issues.map(i => i.message).join(", ")
      });
    }

    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ 
          error: "Authentication failed",
          message: "An unexpected error occurred"
        });
      }

      if (!user) {
        return res.status(401).json({ 
          error: "Authentication failed",
          message: info.message || "Invalid credentials"
        });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ 
            error: "Login failed",
            message: "Failed to create session"
          });
        }

        return res.json({
          message: "Login successful",
          user: { 
            id: user.id,
            email: user.email,
            isPremium: user.isPremium,
            marketingEmails: user.marketingEmails
          }
        });
      });
    })(req, res);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          error: "Logout failed",
          message: err.message 
        });
      }

      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }
    return res.json({
      id: req.user.id,
      email: req.user.email,
      isPremium: req.user.isPremium,
      marketingEmails: req.user.marketingEmails
    });
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Auth error:', err);
    // Ensure we haven't sent a response yet
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Server error',
        message: err.message || 'An unexpected error occurred'
      });
    }
  });
}
