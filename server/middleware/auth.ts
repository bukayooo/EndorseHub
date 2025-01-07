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

export function requirePremium(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.is_premium) {
    console.log('[Auth] Premium required:', {
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      isPremium: req.user?.is_premium
    });
    
    return res.status(403).json({
      success: false,
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
  }
  
  next();
} 