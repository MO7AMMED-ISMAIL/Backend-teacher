// src/validations/subjectValidation.js
const { body } = require('express-validator');

const createSubjectRules = [
    body('teacher')
        .not().exists().withMessage('teacher field is not accepted — subjects are now global. Use POST /api/teacher-subjects to assign a subject to a teacher.'),

    body('name')
        .trim()
        .notEmpty().withMessage('Subject name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
];

const updateSubjectRules = [
    body('teacher')
        .not().exists().withMessage('teacher field is not accepted — subjects are now global.'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),

    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be boolean'),
];

module.exports = { createSubjectRules, updateSubjectRules };
