// src/validations/scheduleValidation.js
const { body } = require('express-validator');

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isAfter = (start, end) => {
    if (!HHMM.test(start) || !HHMM.test(end)) return false;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return eh * 60 + em > sh * 60 + sm;
};

const createScheduleRules = [
    body('subject')
        .not().exists().withMessage('subject field is not accepted — use teacherSubject instead (BREAKING CHANGE)'),

    body('teacherSubject')
        .trim()
        .notEmpty().withMessage('TeacherSubject is required')
        .isMongoId().withMessage('Invalid teacherSubject ID'),

    body('dayOfWeek')
        .notEmpty().withMessage('Day of week is required')
        .isInt({ min: 0, max: 6 }).withMessage('Day of week must be an integer 0-6'),

    body('startTime')
        .trim()
        .notEmpty().withMessage('Start time is required')
        .matches(HHMM).withMessage('Start time must be in HH:mm format'),

    body('endTime')
        .trim()
        .notEmpty().withMessage('End time is required')
        .matches(HHMM).withMessage('End time must be in HH:mm format')
        .custom((value, { req }) => {
            if (!isAfter(req.body.startTime, value)) {
                throw new Error('End time must be after start time');
            }
            return true;
        }),
];

const updateScheduleRules = [
    body('subject').not().exists().withMessage('subject field is not accepted — use teacherSubject instead'),
    body('teacherSubject').optional().trim().isMongoId().withMessage('Invalid teacherSubject ID'),
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('Day of week must be an integer 0-6'),
    body('startTime').optional().trim().matches(HHMM).withMessage('Start time must be in HH:mm format'),
    body('endTime').optional().trim().matches(HHMM).withMessage('End time must be in HH:mm format'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

module.exports = { createScheduleRules, updateScheduleRules };
