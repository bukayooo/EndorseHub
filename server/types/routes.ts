import { Request, Response, NextFunction } from 'express';

// Simple route handler type that allows returning responses
export type RouteHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => any;

// Basic auth middleware
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
