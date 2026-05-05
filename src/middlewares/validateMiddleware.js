// src/middlewares/validateMiddleware.js
const { validationResult } = require('express-validator');

/**
 * validate
 * ────────
 * Sits between the validation rules array and the controller.
 *
 * Flow:
 *   validationRules[]  →  validate  →  controller
 *
 * ✅ Validation passes  → calls next() → controller runs
 * ❌ Validation fails   → returns 422 with structured error list
 *
 * Usage in routes:
 *   router.post('/login', dashboardLoginRules, validate, authController.dashboardLogin)
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
        return next(); // all good → proceed to controller
    }

    const formattedErrors = errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
    }));

    return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
    });
};

module.exports = validate;