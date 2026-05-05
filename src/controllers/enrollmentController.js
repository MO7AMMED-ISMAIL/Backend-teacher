// src/controllers/enrollmentController.js
const Enrollment    = require('../models/Enrollment');
const TeacherSubject = require('../models/TeacherSubject');
const Student       = require('../models/Student');
const Attendance    = require('../models/Attendance');
const { parsePagination, buildMeta } = require('../utils/paginate');

// ─────────────────────────────────────────────────────────────────────────────
//  LIST   GET /api/enrollments?student=&teacherSubject=&teacher=&subject=&isActive=
// ─────────────────────────────────────────────────────────────────────────────
exports.listEnrollments = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = {};

        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
        if (req.query.student) filter.student = req.query.student;

        if (req.token.role === 'teacher') {
            const myTS = await TeacherSubject.find({ teacher: req.token._id, isActive: true }).select('_id');
            const myTSIds = myTS.map(t => t._id);
            if (req.query.teacherSubject) {
                if (!myTSIds.map(id => id.toString()).includes(req.query.teacherSubject)) {
                    const err = new Error('TeacherSubject not found or not yours');
                    err.statusCode = 404;
                    return next(err);
                }
                filter.teacherSubject = req.query.teacherSubject;
            } else {
                filter.teacherSubject = { $in: myTSIds };
            }
        } else {
            if (req.query.teacherSubject) filter.teacherSubject = req.query.teacherSubject;
            // Admin: resolve ?teacher= or ?subject= via TeacherSubject
            if (req.query.teacher || req.query.subject) {
                const tsFilter = {};
                if (req.query.teacher) tsFilter.teacher = req.query.teacher;
                if (req.query.subject) tsFilter.subject = req.query.subject;
                const matchedTS = await TeacherSubject.find(tsFilter).select('_id');
                filter.teacherSubject = { $in: matchedTS.map(t => t._id) };
            }
        }

        const [records, total] = await Promise.all([
            Enrollment.find(filter)
                .populate('student', 'fullName studentNumber isActive')
                .populate({
                    path: 'teacherSubject',
                    select: 'teacher subject isActive',
                    populate: [
                        { path: 'teacher', select: 'name email' },
                        { path: 'subject', select: 'name' },
                    ],
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Enrollment.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: records,
            pagination: buildMeta({ page, limit, total }),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE   POST /api/enrollments
//  Admin or Teacher. Teacher can only enroll in their own TeacherSubjects.
//  Reactivates soft-deleted enrollments on duplicate.
// ─────────────────────────────────────────────────────────────────────────────
exports.createEnrollment = async (req, res, next) => {
    try {
        const { student, teacherSubject } = req.body;

        const studentDoc = await Student.findOne({ _id: student, isActive: true });
        if (!studentDoc) {
            const err = new Error('Active student not found');
            err.statusCode = 404;
            return next(err);
        }

        const ts = await TeacherSubject.findOne({ _id: teacherSubject, isActive: true });
        if (!ts) {
            const err = new Error('Active TeacherSubject not found');
            err.statusCode = 404;
            return next(err);
        }

        if (req.token.role === 'teacher' && ts.teacher.toString() !== req.token._id) {
            const err = new Error('This TeacherSubject does not belong to you');
            err.statusCode = 403;
            return next(err);
        }

        const enrollment = await Enrollment.create({ student, teacherSubject });
        const populated = await enrollment.populate([
            { path: 'student', select: 'fullName studentNumber' },
            { path: 'teacherSubject', select: 'teacher subject', populate: [{ path: 'teacher', select: 'name' }, { path: 'subject', select: 'name' }] },
        ]);

        return res.status(201).json({
            success: true,
            message: 'Enrollment created successfully',
            data: populated,
        });
    } catch (err) {
        if (err.code === 11000) {
            // Reactivate soft-deleted enrollment
            const existing = await Enrollment.findOne({ student: req.body.student, teacherSubject: req.body.teacherSubject });
            if (existing && !existing.isActive) {
                existing.isActive = true;
                await existing.save();
                const populated = await existing.populate([
                    { path: 'student', select: 'fullName studentNumber' },
                    { path: 'teacherSubject', select: 'teacher subject', populate: [{ path: 'teacher', select: 'name' }, { path: 'subject', select: 'name' }] },
                ]);
                return res.json({ success: true, message: 'Enrollment reactivated', data: populated });
            }
            const e = new Error('Student is already enrolled in this teacher-subject');
            e.statusCode = 409;
            return next(e);
        }
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE   DELETE /api/enrollments/:id[?hard=true]
//  Admin or Teacher (teacher must own the enrollment's TeacherSubject).
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteEnrollment = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('teacherSubject', 'teacher');

        if (!enrollment) {
            const err = new Error('Enrollment not found');
            err.statusCode = 404;
            return next(err);
        }

        if (req.token.role === 'teacher' && enrollment.teacherSubject.teacher.toString() !== req.token._id) {
            const err = new Error('Not authorized');
            err.statusCode = 403;
            return next(err);
        }

        if (req.query.hard === 'true') {
            // Hard delete only if no historical attendance for this student in this teacherSubject
            const hasAttendance = await Attendance.exists({
                teacherSubject: enrollment.teacherSubject._id,
                'records.student': enrollment.student,
            });
            if (hasAttendance) {
                const err = new Error('Cannot hard-delete: historical attendance records exist for this student in this assignment');
                err.statusCode = 409;
                return next(err);
            }
            await enrollment.deleteOne();
            return res.json({ success: true, message: 'Enrollment hard-deleted successfully' });
        }

        enrollment.isActive = false;
        await enrollment.save();
        res.json({ success: true, message: 'Enrollment deactivated successfully' });
    } catch (err) {
        next(err);
    }
};
