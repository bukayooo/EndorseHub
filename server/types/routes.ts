import { Request, Response, NextFunction } from 'express';

// Simple route handler type that allows returning responses
export type RouteHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void | Response> | void | Response;

// Helper to safely get authenticated user ID
export function getUserId(req: Request): number {
  if (!req.isAuthenticated() || !req.user?.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
}

// Type guard to check if user is authenticated
export function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated() && req.user?.id !== undefined;
}

// Enhanced auth middleware with proper typing and session verification
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log('[Auth Middleware] Checking auth:', {
    isAuthenticated: req.isAuthenticated?.() || false,
    hasUser: !!req.user,
    userId: req.user?.id || 'none',
    sessionId: req.session?.id || 'none'
  });

  if (!req.isAuthenticated() || !req.user?.id) {
    console.log('[Auth Middleware] Authentication failed');
    res.status(401).json({ 
      success: false,
      error: "Authentication required",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  next();
}
