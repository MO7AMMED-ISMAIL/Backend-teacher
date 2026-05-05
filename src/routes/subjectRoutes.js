// src/routes/subjectRoutes.js
const express = require('express');
const router  = express.Router();

const subjectController = require('../controllers/subjectController');
const { createSubjectRules, updateSubjectRules } = require('../validations/subjectValidation');
const validate       = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// All subject routes require authentication
router.use(authMiddleware);

// GET routes — admin or teacher
router.get('/',    authMiddleware.isAdminOrTeacher, subjectController.listSubjects);
router.get('/:id', authMiddleware.isAdminOrTeacher, subjectController.getSubject);

// CUD routes — admin only
router.post('/',       authMiddleware.isAdmin, createSubjectRules, validate, subjectController.createSubject);
router.put('/:id',     authMiddleware.isAdmin, updateSubjectRules, validate, subjectController.updateSubject);
router.delete('/:id',  authMiddleware.isAdmin, subjectController.deleteSubject);

module.exports = router;
