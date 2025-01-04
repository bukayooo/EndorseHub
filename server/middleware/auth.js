export function isAuthenticated(req, res, next) {
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
