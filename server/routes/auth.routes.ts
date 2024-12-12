import { Router } from "express";
import { setupAuth, authRoutes } from "../auth";

const router = Router();

export function setupAuthRoutes(app: Router) {
  // Mount auth routes
  router.post("/register", authRoutes.registerRoute);
  router.post("/login", authRoutes.loginRoute);
  router.post("/logout", authRoutes.logoutRoute);
  router.get("/user", authRoutes.userRoute);

  // Mount routes
  app.use(router);
  return router;
}
