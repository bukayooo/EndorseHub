import { Router } from "express";
import { setupAuth } from "../auth";
import { authRoutes } from "../auth";
import { requireAuth } from "../types/routes";

const router = Router();

// Setup authentication routes
export function setupAuthRoutes(app: Router) {
  // Register auth middleware and passport setup
  setupAuth(app);

  // Mount auth routes
  router.post("/register", authRoutes.registerRoute);
  router.post("/login", authRoutes.loginRoute);
  router.post("/logout", authRoutes.logoutRoute);
  router.get("/user", requireAuth, authRoutes.userRoute);

  // Mount routes under /auth prefix
  app.use("/auth", router);
  return router;
}
