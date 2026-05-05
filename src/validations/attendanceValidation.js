// src/validations/attendanceValidation.js
const { body } = require('express-validator');

const STATUSES = ['present', 'absent', 'late'];

const submitAttendanceRules = [
    body('subject')
        .not().exists().withMessage('subject field is not accepted — use teacherSubject instead (BREAKING CHANGE)'),

    body('teacherSubject')
        .trim()
        .notEmpty().withMessage('TeacherSubject is required')
        .isMongoId().withMessage('Invalid teacherSubject ID'),

    body('date')
        .notEmpty().withMessage('Date is required')
        .isISO8601().withMessage('Date must be a valid ISO date')
        .toDate(),

    body('records')
        .isArray({ min: 1 }).withMessage('At least one student record is required')
        .custom((records) => {
            const ids = records.map(r => r.student);
            const unique = new Set(ids);
            if (unique.size !== ids.length) {
                throw new Error('Duplicate students in records');
            }
            return true;
        }),

    body('records.*.student')
        .notEmpty().withMessage('Student is required')
        .isMongoId().withMessage('Invalid student ID'),

    body('records.*.status')
        .notEmpty().withMessage('Status is required')
        .isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
];

module.exports = { submitAttendanceRules };
