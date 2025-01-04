import { Router } from "express";
import passport from "passport";
import { findUserById, findUserByEmail, createUser } from "../../db";
import { isAuthenticated } from "../middleware/auth";
import bcrypt from "bcrypt";
import type { User } from "../../db/schema";

export function setupAuthRoutes(app: Router) {
  const router = Router();

  // Debug middleware
  router.use((req, res, next) => {
    console.log('[Auth Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id
    });
    next();
  });

  // Login route
  router.post("/login", (req, res, next) => {
    console.log('[Auth] Login attempt:', { email: req.body.email });
    passport.authenticate('local', (err: any, user: User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("[Auth] Login error:", err);
        return res.status(500).json({
          success: false,
          error: "Failed to login"
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: info?.message || "Invalid credentials"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("[Auth] Login error:", err);
          return res.status(500).json({
            success: false,
            error: "Failed to login"
          });
        }

        console.log('[Auth] Login successful:', { userId: user.id });
        return res.json({
          success: true,
          data: user
        });
      });
    })(req, res, next);
  });

  // Register route
  router.post("/register", async (req, res) => {
    try {
      const { email, password, username } = req.body;
      console.log('[Auth] Registration attempt:', { email });
      
      const existingUser = await findUserByEmail(email);

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Email already registered"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await createUser({
        email,
        password: hashedPassword,
        username,
        is_premium: false,
        marketing_emails: true,
        keep_me_logged_in: false
      });

      req.logIn(user, (err) => {
        if (err) {
          console.error("[Auth] Registration login error:", err);
          return res.status(500).json({
            success: false,
            error: "Failed to login after registration"
          });
        }

        console.log('[Auth] Registration successful:', { userId: user.id });
        return res.json({
          success: true,
          data: user
        });
      });
    } catch (error) {
      console.error("[Auth] Registration error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to register"
      });
    }
  });

  // Logout route
  router.post("/logout", (req, res) => {
    console.log('[Auth] Logout attempt:', { userId: req.user?.id });
    req.logout(() => {
      res.clearCookie("connect.sid");
      console.log('[Auth] Logout successful');
      return res.json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });

  // Get current user route
  router.get("/me", isAuthenticated, async (req, res) => {
    try {
      console.log('[Auth] Get current user:', { userId: req.user?.id });
      const user = await findUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }

      return res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error("[Auth] Get user error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get user"
      });
    }
  });

  // Mount routes at /auth
  app.use("/auth", router);
  console.log('[Auth] Routes mounted at /auth');
  return router;
}
