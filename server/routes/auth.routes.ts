import { Router } from "express";
import { setupAuth } from "../auth";
import { users, insertUserSchema } from "@db/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

const router = Router();

// Setup authentication routes
export function setupAuthRoutes(app: Router) {
  // Register auth middleware and passport setup
  setupAuth(app);

  // User registration
  router.post("/register", async (req, res, next) => {
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
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create the new user (handled by setupAuth)
      return next();
    } catch (error) {
      next(error);
    }
  });

  // User profile
  router.get("/user", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    return res.status(401).json({ 
      error: "Authentication required",
      message: "Not logged in" 
    });
  });

  return router;
}
