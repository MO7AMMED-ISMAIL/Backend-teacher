// src/routes/index.js
const express = require('express');
const router  = express.Router();

// health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes

router.use('/auth',     require('./authRoutes'));
router.use('/teachers', require('./teacherRoutes'));
router.use('/subjects',         require('./subjectRoutes'));
router.use('/teacher-subjects', require('./teacherSubjectRoutes'));
router.use('/enrollments',      require('./enrollmentRoutes'));
router.use('/students', require('./studentRoutes'));
router.use('/schedules', require('./scheduleRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/dashboard',       require('./dashboardRoutes'));
router.use('/admin/dashboard', require('./adminDashboardRoutes'));


module.exports = router;
