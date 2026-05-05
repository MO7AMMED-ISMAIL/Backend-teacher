// src/validations/teacherSubjectValidation.js
const { body } = require('express-validator');

const createTeacherSubjectRules = [
    body('teacher')
        .trim()
        .notEmpty().withMessage('Teacher is required')
        .isMongoId().withMessage('Invalid teacher ID'),

    body('subject')
        .trim()
        .notEmpty().withMessage('Subject is required')
        .isMongoId().withMessage('Invalid subject ID'),
];

const updateTeacherSubjectRules = [
    body('teacher')
        .not().exists().withMessage('Cannot change teacher on an existing assignment — delete and recreate instead'),

    body('subject')
        .not().exists().withMessage('Cannot change subject on an existing assignment — delete and recreate instead'),

    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be boolean'),
];

module.exports = { createTeacherSubjectRules, updateTeacherSubjectRules };
