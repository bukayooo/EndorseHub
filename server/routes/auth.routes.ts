import { Router } from "express";
import { setupAuth } from "../auth";

export async function setupAuthRoutes(app: Router) {
  // Setup auth and get routes
  const { loginRoute, registerRoute, logoutRoute, userRoute } = await setupAuth(app);

  // Debug middleware for auth routes
  app.use((req, res, next) => {
    console.log('[Auth Route] Request received:', {
      method: req.method,
      path: req.path,
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      cookies: req.headers.cookie
    });
    next();
  });

  // Auth routes
  app.post("/login", loginRoute);
  app.post("/register", registerRoute);
  app.post("/logout", logoutRoute);
  app.get("/user", userRoute);

  console.log('[Auth] Routes mounted');
  return app;
}
