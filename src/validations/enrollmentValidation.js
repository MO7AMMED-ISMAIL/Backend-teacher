// src/validations/enrollmentValidation.js
const { body } = require('express-validator');

const createEnrollmentRules = [
    body('student')
        .trim()
        .notEmpty().withMessage('Student is required')
        .isMongoId().withMessage('Invalid student ID'),

    body('teacherSubject')
        .trim()
        .notEmpty().withMessage('TeacherSubject is required')
        .isMongoId().withMessage('Invalid teacherSubject ID'),
];

module.exports = { createEnrollmentRules };
