import { Request, Response, NextFunction } from 'express';

// Simple route handler type that allows returning responses
export type RouteHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void | Response> | void | Response;

// Helper to safely get authenticated user ID
export function getUserId(req: Request): number {
  if (!req.user?.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
}

// Type guard to check if user is authenticated
export function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated() && req.user?.id !== undefined;
}

// Basic auth middleware with proper typing
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
