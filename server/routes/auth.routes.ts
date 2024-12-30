import { Router } from "express";
import passport from "passport";
import { findUserById, findUserByEmail, createUser } from "../auth";
import { requireAuth } from "../types/routes";
import bcrypt from "bcrypt";
import type { User } from "../../db/schema";

export function setupAuthRoutes(app: Router) {
  const router = Router();

  // Login route
  router.post("/login", (req, res, next) => {
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
        username
      });

      req.logIn(user, (err) => {
        if (err) {
          console.error("[Auth] Registration login error:", err);
          return res.status(500).json({
            success: false,
            error: "Failed to login after registration"
          });
        }

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
    req.logout(() => {
      res.clearCookie("connect.sid");
      return res.json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });

  // Get current user route
  router.get("/me", requireAuth, async (req, res) => {
    try {
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

  // Mount routes at /api/auth
  app.use("/api/auth", router);
  return router;
}
