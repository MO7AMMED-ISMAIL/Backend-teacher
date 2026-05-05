// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD LOGIN   POST /api/auth/dashboard/login
//  Roles allowed: admin, teacher
// ─────────────────────────────────────────────────────────────────────────────
exports.dashboardLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Find user (select password because it's hidden by default)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            return next(err);
        }

        // 2. Block students from dashboard
        if (!['admin', 'teacher'].includes(user.role)) {
            const err = new Error('Students must use the mobile app to login');
            err.statusCode = 403;
            return next(err);
        }

        // 3. Check account is active
        if (!user.isActive) {
            const err = new Error('Your account has been deactivated. Contact admin');
            err.statusCode = 403;
            return next(err);
        }

        // 4. Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            return next(err);
        }

        // 5. Sign token  ← your exact pattern
        const token = jwt.sign(
            {
                _id: user._id,
                name: user.name,
                role: user.role,
            },
            process.env.SECRETKEY,
            { expiresIn: '7d' }
        );

        // 6. Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        res.json({
            data: 'Authenticated',
            token,
            user: user.toJSON(),
        });

    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MOBILE LOGIN   POST /api/auth/mobile/login
//  Roles allowed: student, teacher
// ─────────────────────────────────────────────────────────────────────────────
exports.mobileLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            return next(err);
        }

        // Block admin from mobile
        if (!['student', 'teacher'].includes(user.role)) {
            const err = new Error('Admins must use the dashboard to login');
            err.statusCode = 403;
            return next(err);
        }

        if (!user.isActive) {
            const err = new Error('Your account has been deactivated. Contact admin');
            err.statusCode = 403;
            return next(err);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            return next(err);
        }

        // Mobile token — longer expiry (30 days)
        const token = jwt.sign(
            {
                _id: user._id,
                name: user.name,
                role: user.role,
            },
            process.env.SECRETKEY,
            { expiresIn: '30d' }
        );

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        res.json({
            data: 'Authenticated',
            token,
            user: user.toJSON(),
        });

    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  REGISTER   POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role, subject, department, grade, studentId, phone } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            const err = new Error('Email already registered');
            err.statusCode = 409;
            return next(err);
        }

        const user = await User.create({
            name, email, password,
            role: role || 'student',
            subject, department,
            grade, studentId,
            phone,
        });

        const token = jwt.sign(
            {
                _id: user._id,
                name: user.name,
                role: user.role,
            },
            process.env.SECRETKEY,
            { expiresIn: user.role === 'student' ? '30d' : '7d' }
        );

        res.status(201).json({
            data: 'Account created successfully',
            token,
            user: user.toJSON(),
        });

    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ME   GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
    try {
        // req.token is set by authMiddleware
        const user = await User.findById(req.token._id);
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            return next(err);
        }
        res.json({ data: user });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  LOGOUT   POST /api/auth/logout
//  JWT is stateless — client just deletes the token
// ─────────────────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
    res.json({ data: 'Logged out successfully' });
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE FIRST ADMIN   POST /api/auth/create-admin
//  One-time setup — succeeds only if no admin exists in the database.
// ─────────────────────────────────────────────────────────────────────────────
exports.createFirstAdmin = async (req, res, next) => {
    try {
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            const err = new Error('An admin already exists. Only one admin can be created through this endpoint.');
            err.statusCode = 409;
            return next(err);
        }

        const { name, email, password, phone } = req.body;

        const emailTaken = await User.findOne({ email });
        if (emailTaken) {
            const err = new Error('Email already registered');
            err.statusCode = 409;
            return next(err);
        }

        const admin = await User.create({
            name,
            email,
            password,
            phone,
            role: 'admin',
        });

        const token = jwt.sign(
            { _id: admin._id, name: admin.name, role: admin.role },
            process.env.SECRETKEY,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            data: 'Admin created successfully',
            token,
            user: admin.toJSON(),
        });
    } catch (err) {
        next(err);
    }
};