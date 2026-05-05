// src/controllers/teacherSubjectController.js
const TeacherSubject = require('../models/TeacherSubject');
const Enrollment    = require('../models/Enrollment');
const Schedule      = require('../models/Schedule');
const Attendance    = require('../models/Attendance');
const User          = require('../models/User');
const Subject       = require('../models/Subject');
const { parsePagination, buildMeta } = require('../utils/paginate');

// ─────────────────────────────────────────────────────────────────────────────
//  LIST   GET /api/teacher-subjects?teacher=&subject=&isActive=&withStats=
// ─────────────────────────────────────────────────────────────────────────────
exports.listTeacherSubjects = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = {};

        if (req.token.role === 'teacher') {
            filter.teacher = req.token._id;
        } else if (req.query.teacher) {
            filter.teacher = req.query.teacher;
        }

        if (req.query.subject)  filter.subject  = req.query.subject;
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

        const [records, total] = await Promise.all([
            TeacherSubject.find(filter)
                .populate('teacher', 'name email')
                .populate('subject', 'name description')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            TeacherSubject.countDocuments(filter),
        ]);

        let data = records.map((r) => r.toObject());

        if (req.query.withStats === 'true') {
            data = await Promise.all(data.map(async (row) => {
                const [students, scheduledClasses, attendanceSessions] = await Promise.all([
                    Enrollment.countDocuments({ teacherSubject: row._id, isActive: true }),
                    Schedule.countDocuments({ teacherSubject: row._id, isActive: true }),
                    Attendance.countDocuments({ teacherSubject: row._id }),
                ]);
                return { ...row, stats: { students, scheduledClasses, attendanceSessions } };
            }));
        }

        res.json({
            success: true,
            data,
            pagination: buildMeta({ page, limit, total }),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ONE   GET /api/teacher-subjects/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getTeacherSubject = async (req, res, next) => {
    try {
        const ts = await TeacherSubject.findById(req.params.id)
            .populate('teacher', 'name email')
            .populate('subject', 'name description');

        if (!ts) {
            const err = new Error('Assignment not found');
            err.statusCode = 404;
            return next(err);
        }

        if (req.token.role === 'teacher' && ts.teacher._id.toString() !== req.token._id) {
            const err = new Error('Not authorized');
            err.statusCode = 403;
            return next(err);
        }

        res.json({ success: true, data: ts });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE   POST /api/teacher-subjects
//  Admin only. Reactivates soft-deleted record instead of erroring.
// ─────────────────────────────────────────────────────────────────────────────
exports.createTeacherSubject = async (req, res, next) => {
    try {
        const { teacher, subject } = req.body;

        const teacherUser = await User.findOne({ _id: teacher, role: 'teacher', isActive: true });
        if (!teacherUser) {
            const err = new Error('Active teacher not found');
            err.statusCode = 404;
            return next(err);
        }

        const subjectDoc = await Subject.findOne({ _id: subject, isActive: true });
        if (!subjectDoc) {
            const err = new Error('Active subject not found');
            err.statusCode = 404;
            return next(err);
        }

        const ts = await TeacherSubject.create({ teacher, subject });
        const populated = await ts.populate([
            { path: 'teacher', select: 'name email' },
            { path: 'subject', select: 'name description' },
        ]);

        return res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            data: populated,
        });
    } catch (err) {
        if (err.code === 11000) {
            // Reactivate a soft-deleted record
            const existing = await TeacherSubject.findOne({ teacher: req.body.teacher, subject: req.body.subject });
            if (existing && !existing.isActive) {
                existing.isActive = true;
                await existing.save();
                const populated = await existing.populate([
                    { path: 'teacher', select: 'name email' },
                    { path: 'subject', select: 'name description' },
                ]);
                return res.json({
                    success: true,
                    message: 'Assignment reactivated',
                    data: populated,
                });
            }
            const e = new Error('Assignment already exists for this teacher and subject');
            e.statusCode = 409;
            return next(e);
        }
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE   PUT /api/teacher-subjects/:id
//  Admin only. Only isActive is editable.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateTeacherSubject = async (req, res, next) => {
    try {
        const ts = await TeacherSubject.findById(req.params.id);
        if (!ts) {
            const err = new Error('Assignment not found');
            err.statusCode = 404;
            return next(err);
        }

        if (req.body.isActive !== undefined) ts.isActive = req.body.isActive;
        await ts.save();

        const populated = await ts.populate([
            { path: 'teacher', select: 'name email' },
            { path: 'subject', select: 'name description' },
        ]);

        res.json({ success: true, message: 'Assignment updated', data: populated });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE   DELETE /api/teacher-subjects/:id
//  Admin only. Hard-delete only if no dependent records exist.
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteTeacherSubject = async (req, res, next) => {
    try {
        const ts = await TeacherSubject.findById(req.params.id);
        if (!ts) {
            const err = new Error('Assignment not found');
            err.statusCode = 404;
            return next(err);
        }

        const [schedules, attendance, enrollments] = await Promise.all([
            Schedule.countDocuments({ teacherSubject: ts._id }),
            Attendance.countDocuments({ teacherSubject: ts._id }),
            Enrollment.countDocuments({ teacherSubject: ts._id }),
        ]);

        if (schedules > 0 || attendance > 0 || enrollments > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete: assignment has dependent records',
                dependents: { schedules, attendance, enrollments },
                hint: 'Deactivate via PUT instead to preserve history',
            });
        }

        await ts.deleteOne();
        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (err) {
        next(err);
    }
};
