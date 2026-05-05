// src/routes/studentRoutes.js
const express = require('express');
const router  = express.Router();

const studentController = require('../controllers/studentController');
const { createStudentRules, updateStudentRules } = require('../validations/studentValidation');
const validate       = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// All student routes require authenticated teacher
router.use(authMiddleware, authMiddleware.isTeacher);

router.get('/',        studentController.listStudents);
router.get('/:id',     studentController.getStudent);
router.post('/',       createStudentRules, validate, studentController.createStudent);
router.put('/:id',     updateStudentRules, validate, studentController.updateStudent);
router.delete('/:id',  studentController.deleteStudent);

module.exports = router;
