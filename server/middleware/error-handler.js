export const errorHandler = (err, req, res, next) => {
    console.error('[Error Handler]', {
        error: err,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        user: req.user?.id,
        session: req.session?.id
    });
    // Handle database errors
    if (err?.code?.startsWith('P') || err?.code?.startsWith('23')) {
        return res.status(503).json({
            success: false,
            error: 'Database error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    // Handle authentication errors
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    // Handle session errors
    if (err.name === 'SessionError') {
        return res.status(401).json({
            success: false,
            error: 'Session expired or invalid',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    // Default error response
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};
