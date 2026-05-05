// src/validations/teacherValidation.js
const { body } = require('express-validator');

const createTeacherRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/\d/).withMessage('Password must contain at least one number'),

    body('subject')
        .trim()
        .notEmpty().withMessage('Subject is required')
        .isLength({ min: 2, max: 60 }).withMessage('Subject must be between 2 and 60 characters'),

    body('phone').optional().trim(),
];

const updateTeacherRules = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),

    body('password')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/\d/).withMessage('Password must contain at least one number'),

    body('subject')
        .optional()
        .trim()
        .isLength({ min: 2, max: 60 }).withMessage('Subject must be between 2 and 60 characters'),

    body('phone').optional().trim(),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

module.exports = { createTeacherRules, updateTeacherRules };
