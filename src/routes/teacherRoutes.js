// src/routes/teacherRoutes.js
const express = require('express');
const router  = express.Router();

const teacherController = require('../controllers/teacherController');
const { createTeacherRules, updateTeacherRules } = require('../validations/teacherValidation');
const validate          = require('../middlewares/validateMiddleware');
const authMiddleware    = require('../middlewares/authMiddleware');

// All teacher routes require an authenticated admin
router.use(authMiddleware, authMiddleware.isAdmin);

router.get('/',        teacherController.listTeachers);
router.get('/:id',     teacherController.getTeacher);
router.post('/',       createTeacherRules, validate, teacherController.createTeacher);
router.put('/:id',     updateTeacherRules, validate, teacherController.updateTeacher);
router.delete('/:id',  teacherController.deleteTeacher);

module.exports = router;
