// src/routes/teacherSubjectRoutes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/teacherSubjectController');
const { createTeacherSubjectRules, updateTeacherSubjectRules } = require('../validations/teacherSubjectValidation');
const validate       = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/',    authMiddleware.isAdminOrTeacher, controller.listTeacherSubjects);
router.get('/:id', authMiddleware.isAdminOrTeacher, controller.getTeacherSubject);

router.post('/',       authMiddleware.isAdmin, createTeacherSubjectRules, validate, controller.createTeacherSubject);
router.put('/:id',     authMiddleware.isAdmin, updateTeacherSubjectRules, validate, controller.updateTeacherSubject);
router.delete('/:id',  authMiddleware.isAdmin, controller.deleteTeacherSubject);

module.exports = router;
