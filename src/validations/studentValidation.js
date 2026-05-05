// src/validations/studentValidation.js
const { body } = require('express-validator');

const createStudentRules = [
    body('subjects')
        .not().exists().withMessage('subjects field is not accepted — use POST /api/enrollments to enroll students in teacher-subjects'),

    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('address')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Address must be at most 200 characters'),

    body('phone')
        .optional()
        .trim(),

    body('parentPhone')
        .optional()
        .trim(),

    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Notes must be at most 500 characters'),
];

const updateStudentRules = [
    body('subjects')
        .not().exists().withMessage('subjects field is not accepted — use POST /api/enrollments to enroll students in teacher-subjects'),

    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('address')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Address must be at most 200 characters'),

    body('phone')
        .optional()
        .trim(),

    body('parentPhone')
        .optional()
        .trim(),

    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Notes must be at most 500 characters'),

    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be boolean'),
];

module.exports = { createStudentRules, updateStudentRules };
