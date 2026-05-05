// src/controllers/teacherController.js
const User = require('../models/User');
const { parsePagination, buildMeta } = require('../utils/paginate');

// ─────────────────────────────────────────────────────────────────────────────
//  LIST TEACHERS   GET /api/teachers?page=1&limit=10&search=
//  Admin only.
// ─────────────────────────────────────────────────────────────────────────────
exports.listTeachers = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);

        const filter = { role: 'teacher' };
        if (req.query.search) {
            const regex = new RegExp(req.query.search.trim(), 'i');
            filter.$or = [{ name: regex }, { email: regex }, { subject: regex }];
        }

        const [teachers, total] = await Promise.all([
            User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: teachers,
            pagination: buildMeta({ page, limit, total }),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ONE TEACHER   GET /api/teachers/:id
//  Admin only.
// ─────────────────────────────────────────────────────────────────────────────
exports.getTeacher = async (req, res, next) => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' });
        if (!teacher) {
            const err = new Error('Teacher not found');
            err.statusCode = 404;
            return next(err);
        }
        res.json({ success: true, data: teacher });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE TEACHER   POST /api/teachers
//  Admin only. Body: { name, email, password, subject }
// ─────────────────────────────────────────────────────────────────────────────
exports.createTeacher = async (req, res, next) => {
    try {
        const { name, email, password, subject, phone } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            const err = new Error('Email already registered');
            err.statusCode = 409;
            return next(err);
        }

        const teacher = await User.create({
            name,
            email,
            password,
            subject,
            phone,
            role: 'teacher',
        });

        res.status(201).json({
            success: true,
            message: 'Teacher created successfully',
            data: teacher,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE TEACHER   PUT /api/teachers/:id
//  Admin only. Body: any of { name, email, subject, phone, isActive, password }
// ─────────────────────────────────────────────────────────────────────────────
exports.updateTeacher = async (req, res, next) => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('+password');
        if (!teacher) {
            const err = new Error('Teacher not found');
            err.statusCode = 404;
            return next(err);
        }

        const allowed = ['name', 'email', 'subject', 'phone', 'isActive', 'password'];
        for (const key of allowed) {
            if (req.body[key] !== undefined && req.body[key] !== '') {
                teacher[key] = req.body[key];
            }
        }

        await teacher.save(); // triggers pre-save hook (hashes password if modified)

        res.json({
            success: true,
            message: 'Teacher updated successfully',
            data: teacher.toJSON(),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE TEACHER   DELETE /api/teachers/:id
//  Admin only.
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteTeacher = async (req, res, next) => {
    try {
        const teacher = await User.findOneAndDelete({ _id: req.params.id, role: 'teacher' });
        if (!teacher) {
            const err = new Error('Teacher not found');
            err.statusCode = 404;
            return next(err);
        }
        res.json({
            success: true,
            message: 'Teacher deleted successfully',
            data: { _id: teacher._id },
        });
    } catch (err) {
        next(err);
    }
};
