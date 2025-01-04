// Helper to safely get authenticated user ID
export function getUserId(req) {
    if (!req.isAuthenticated() || !req.user?.id) {
        throw new Error('User not authenticated');
    }
    return req.user.id;
}
// Type guard to check if user is authenticated
export function isAuthenticated(req) {
    return req.isAuthenticated() && req.user?.id !== undefined;
}
// Enhanced auth middleware with proper typing and session verification
export function requireAuth(req, res, next) {
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
