// src/routes/scheduleRoutes.js
const express = require('express');
const router  = express.Router();

const scheduleController = require('../controllers/scheduleController');
const { createScheduleRules, updateScheduleRules } = require('../validations/scheduleValidation');
const validate       = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware, authMiddleware.isTeacher);

router.get('/',        scheduleController.listSchedules);
router.get('/:id',     scheduleController.getSchedule);
router.post('/',       createScheduleRules, validate, scheduleController.createSchedule);
router.put('/:id',     updateScheduleRules, validate, scheduleController.updateSchedule);
router.delete('/:id',  scheduleController.deleteSchedule);

module.exports = router;
