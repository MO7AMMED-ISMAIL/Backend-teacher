// src/config/jwt.js

/**
 * Returns JWT config based on client type.
 * - 'dashboard'  → admin / teacher login (shorter expiry)
 * - 'mobile'     → student mobile app   (longer expiry)
 */
const getJwtConfig = (clientType = 'dashboard') => {
    if (clientType === 'mobile') {
        return {
            secret: process.env.JWT_MOBILE_SECRET,
            expiresIn: process.env.JWT_MOBILE_EXPIRES_IN || '30d',
        };
    }
    return {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    };
};

module.exports = { getJwtConfig };