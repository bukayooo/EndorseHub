import { Router } from "express";
import { setupAuth } from "../auth";
import type { Request, Response, NextFunction } from "express";

export async function setupAuthRoutes(app: Router) {
  // Setup auth and get routes
  const { loginRoute, registerRoute, logoutRoute } = await setupAuth(app);

  // Debug middleware for auth routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log('[Auth] Request:', {
      path: req.path,
      method: req.method,
      session: req.session?.id,
      user: req.user?.id,
      isAuthenticated: req.isAuthenticated()
    });
    next();
  });

  // Auth routes
  app.post("/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('[Auth] Login attempt:', { email: req.body.email });
      await loginRoute(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  app.post("/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('[Auth] Register attempt:', { email: req.body.email });
      await registerRoute(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  app.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('[Auth] Logout attempt:', { userId: req.user?.id });
      await logoutRoute(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  app.get("/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      console.log('[Auth] User check failed: Not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    console.log('[Auth] User check success:', { userId: req.user.id });
    res.json({
      success: true,
      data: req.user
    });
  });

  console.log('[Auth] Routes mounted');
  return app;
}