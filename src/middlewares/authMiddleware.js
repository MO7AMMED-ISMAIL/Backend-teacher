// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

// ── protect: verify token and attach decoded data to req.token ────────────────
module.exports = (req, res, next) => {
    try {
        const token = req.get('authorization').split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.SECRETKEY);
        req.token = decodedToken;
        next();
    } catch (err) {
        err.message = 'Not Authenticated';
        err.statusCode = 401;
        next(err);
    }
};

// ── isAdmin: only admin role can pass ─────────────────────────────────────────
module.exports.isAdmin = (req, res, next) => {
    if (req.token.role === 'admin') {
        next();
    } else {
        const err = new Error('You are not authorized to access this data');
        err.statusCode = 403;
        next(err);
    }
};

// ── isTeacher: only teacher role can pass ─────────────────────────────────────
module.exports.isTeacher = (req, res, next) => {
    if (req.token.role === 'teacher') {
        next();
    } else {
        const err = new Error('You are not authorized to access this data');
        err.statusCode = 403;
        next(err);
    }
};

// ── isStudent: only student role can pass ─────────────────────────────────────
module.exports.isStudent = (req, res, next) => {
    if (req.token.role === 'student') {
        next();
    } else {
        const err = new Error('You are not authorized to access this data');
        err.statusCode = 403;
        next(err);
    }
};

// ── isAdminOrTeacher: admin or teacher can pass ───────────────────────────────
module.exports.isAdminOrTeacher = (req, res, next) => {
    if (req.token.role === 'admin' || req.token.role === 'teacher') {
        next();
    } else {
        const err = new Error('You are not authorized to access this data');
        err.statusCode = 403;
        next(err);
    }
};

// ── updateData: admin can update anyone, user can update only themselves ───────
module.exports.updateData = (req, res, next) => {
    if (req.token.role === 'admin' || req.token._id == req.body._id) {
        next();
    } else {
        const err = new Error('You are not authorized to access this data');
        err.statusCode = 403;
        next(err);
    }
};