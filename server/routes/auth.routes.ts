import { Router } from "express";
import { setupAuth } from "../auth";

const router = Router();

export async function setupAuthRoutes(app: Router) {
  const auth = await setupAuth(app);

  // Mount auth routes
  router.post("/register", auth.registerRoute);
  router.post("/login", auth.loginRoute);
  router.post("/logout", auth.logoutRoute);
  router.get("/user", auth.userRoute);

  // Mount routes
  app.use("/auth", router);
  return router;
}
