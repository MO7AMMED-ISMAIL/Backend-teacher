// src/routes/authRoutes.js
const express    = require('express');
const router     = express.Router();

const authController  = require('../controllers/authController');
const {
    dashboardLoginRules,
    mobileLoginRules,
    registerRules,
    createAdminRules,
} = require('../validations/authValidation');
const validate        = require('../middlewares/validateMiddleware');
const authMiddleware  = require('../middlewares/authMiddleware');

// ── Public routes ─────────────────────────────────────────────────────────────

// Admin / Teacher dashboard login
router.post('/dashboard/login', dashboardLoginRules, validate, authController.dashboardLogin);

// Student mobile login
router.post('/mobile/login', mobileLoginRules, validate, authController.mobileLogin);

// One-time admin creation (works only when no admin exists yet)
router.post('/create-admin', createAdminRules, validate, authController.createFirstAdmin);

// Register new user — admin only
router.post('/register', authMiddleware, authMiddleware.isAdmin, registerRules, validate, authController.register);

// ── Protected routes ──────────────────────────────────────────────────────────

// Get current logged-in user profile
router.get('/me', authMiddleware, authController.getMe);

// Logout
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
