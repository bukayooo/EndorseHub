import { Router } from "express";
import { setupAuth } from "../auth";

export async function setupAuthRoutes(app: Router) {
  // Setup auth and get routes
  const { loginRoute, registerRoute, logoutRoute, userRoute } = await setupAuth(app);

  // Auth routes
  app.post("/login", loginRoute);
  app.post("/register", registerRoute);
  app.post("/logout", logoutRoute);
  app.get("/user", (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    
    res.json({
      success: true,
      data: req.user
    });
  });

  console.log('[Auth] Routes mounted');
  return app;
}
