import { Request, Response, NextFunction } from 'express';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  console.log('[Auth] Unauthorized access attempt:', {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID,
    hasUser: !!req.user
  });
  
  res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
} 