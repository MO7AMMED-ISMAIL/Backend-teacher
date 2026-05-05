// src/routes/attendanceRoutes.js
const express = require('express');
const router  = express.Router();

const attendanceController = require('../controllers/attendanceController');
const { submitAttendanceRules } = require('../validations/attendanceValidation');
const validate       = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware, authMiddleware.isTeacher);

// /summary MUST come before /:id so it doesn't get caught by the param route
router.get('/summary', attendanceController.getAttendanceSummary);
router.get('/',        attendanceController.listAttendance);
router.get('/:id',     attendanceController.getAttendance);
router.post('/',       submitAttendanceRules, validate, attendanceController.submitAttendance);

module.exports = router;
