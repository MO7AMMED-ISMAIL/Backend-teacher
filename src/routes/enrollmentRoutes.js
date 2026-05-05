// src/routes/enrollmentRoutes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/enrollmentController');
const { createEnrollmentRules } = require('../validations/enrollmentValidation');
const validate       = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/',    authMiddleware.isAdminOrTeacher, controller.listEnrollments);
router.post('/',   authMiddleware.isAdminOrTeacher, createEnrollmentRules, validate, controller.createEnrollment);
router.delete('/:id', authMiddleware.isAdminOrTeacher, controller.deleteEnrollment);

module.exports = router;
