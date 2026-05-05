// src/utils/response.js

/**
 * Standardised JSON response helpers.
 *
 * Every endpoint should use these so the frontend always gets
 * a consistent shape: { success, message, data? }
 */

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
    const body = { success: false, message };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
};

const sendCreated = (res, data = {}, message = 'Created successfully') => {
    return sendSuccess(res, data, message, 201);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
    return sendError(res, message, 401);
};

const sendForbidden = (res, message = 'Forbidden') => {
    return sendError(res, message, 403);
};

const sendNotFound = (res, message = 'Resource not found') => {
    return sendError(res, message, 404);
};

module.exports = {
    sendSuccess,
    sendError,
    sendCreated,
    sendUnauthorized,
    sendForbidden,
    sendNotFound,
};