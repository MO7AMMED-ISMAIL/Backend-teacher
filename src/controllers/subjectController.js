// src/controllers/subjectController.js
const Subject        = require('../models/Subject');
const TeacherSubject = require('../models/TeacherSubject');
const { parsePagination, buildMeta } = require('../utils/paginate');

// ─────────────────────────────────────────────────────────────────────────────
//  LIST SUBJECTS   GET /api/subjects?page=1&limit=10&search=&isActive=
//  Global catalog — admin and teachers see the same list.
// ─────────────────────────────────────────────────────────────────────────────
exports.listSubjects = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = {};

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }

        if (req.query.search) {
            filter.name = new RegExp(req.query.search.trim(), 'i');
        }

        const [subjects, total] = await Promise.all([
            Subject.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Subject.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: subjects,
            pagination: buildMeta({ page, limit, total }),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ONE SUBJECT   GET /api/subjects/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            const err = new Error('Subject not found');
            err.statusCode = 404;
            return next(err);
        }
        res.json({ success: true, data: subject });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE SUBJECT   POST /api/subjects
//  Admin only. Body: { name, description }
// ─────────────────────────────────────────────────────────────────────────────
exports.createSubject = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const subject = await Subject.create({ name, description });
        res.status(201).json({
            success: true,
            message: 'Subject created successfully',
            data: subject,
        });
    } catch (err) {
        if (err.code === 11000) {
            const e = new Error('A subject with this name already exists');
            e.statusCode = 409;
            return next(e);
        }
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE SUBJECT   PUT /api/subjects/:id
//  Admin only.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            const err = new Error('Subject not found');
            err.statusCode = 404;
            return next(err);
        }

        const allowed = ['name', 'description', 'isActive'];
        for (const key of allowed) {
            if (req.body[key] !== undefined) subject[key] = req.body[key];
        }

        await subject.save();
        res.json({ success: true, message: 'Subject updated successfully', data: subject });
    } catch (err) {
        if (err.code === 11000) {
            const e = new Error('A subject with this name already exists');
            e.statusCode = 409;
            return next(e);
        }
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE SUBJECT   DELETE /api/subjects/:id
//  Admin only. Soft-delete + cascade TeacherSubjects.
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            const err = new Error('Subject not found');
            err.statusCode = 404;
            return next(err);
        }

        subject.isActive = false;
        await subject.save();

        const { modifiedCount } = await TeacherSubject.updateMany(
            { subject: subject._id },
            { isActive: false }
        );

        res.json({
            success: true,
            message: 'Subject deactivated successfully',
            data: { cascadedAssignments: modifiedCount },
        });
    } catch (err) {
        next(err);
    }
};
