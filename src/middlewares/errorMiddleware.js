// src/middlewares/errorMiddleware.js

/**
 * notFound
 * ────────
 * Catches any request that didn't match a route.
 * Register BEFORE errorHandler.
 */
const notFound = (req, res, next) => {
    const err = new Error(`Route not found: ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
};

/**
 * errorHandler
 * ────────────
 * Global error handler — must be registered LAST in Express.
 * Catches any error passed via next(err).
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose: duplicate key (e.g. duplicate email)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    }

    // Mongoose: validation error
    if (err.name === 'ValidationError') {
        statusCode = 422;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }

    // Mongoose: bad ObjectId
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token.'; }
    if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired.'; }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { notFound, errorHandler };