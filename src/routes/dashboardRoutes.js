// src/routes/dashboardRoutes.js
const express = require('express');
const router  = express.Router();

const dashboardController = require('../controllers/dashboardController');
const authMiddleware      = require('../middlewares/authMiddleware');

router.get('/teacher', authMiddleware, authMiddleware.isTeacher, dashboardController.getTeacherDashboard);

module.exports = router;
