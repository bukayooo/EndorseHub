import { Router } from "express";
import { findUserById, findUserByEmail, createUser } from "../auth";
import { requireAuth } from "../types/routes";
import bcrypt from "bcrypt";

export function setupAuthRoutes(app: Router) {
  const router = Router();

  // Login route
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await findUserByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

      req.session.userId = user.id;
      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          isPremium: user.isPremium
        }
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to login"
      });
    }
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

      req.session.userId = user.id;
      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          isPremium: user.isPremium
        }
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
    req.session.destroy((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return res.status(500).json({
          success: false,
          error: "Failed to logout"
        });
      }
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
        data: {
          id: user.id,
          email: user.email,
          isPremium: user.isPremium
        }
      });
    } catch (error) {
      console.error("[Auth] Get user error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get user"
      });
    }
  });

  app.use("/auth", router);
  return router;
}
