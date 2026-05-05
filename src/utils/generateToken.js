// src/utils/generateToken.js
const jwt = require('jsonwebtoken');
const { getJwtConfig } = require('../config/jwt');

/**
 * generateToken(userId, role, clientType)
 *
 * @param {string} userId     - MongoDB _id
 * @param {string} role       - 'admin' | 'teacher' | 'student'
 * @param {string} clientType - 'dashboard' | 'mobile'
 * @returns {string} signed JWT
 */
const generateToken = (userId, role, clientType = 'dashboard') => {
    const { secret, expiresIn } = getJwtConfig(clientType);

    return jwt.sign(
        {
            id: userId,
            role,
            clientType, // stored in payload so we know which app issued it
        },
        secret,
        { expiresIn }
    );
};

module.exports = generateToken;