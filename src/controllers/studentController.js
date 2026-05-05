// src/controllers/studentController.js
const mongoose  = require('mongoose');
const Student   = require('../models/Student');
const TeacherSubject = require('../models/TeacherSubject');
const Enrollment = require('../models/Enrollment');
const { parsePagination, buildMeta } = require('../utils/paginate');

// ─────────────────────────────────────────────────────────────────────────────
//  LIST STUDENTS   GET /api/students?page=&limit=&search=&teacherSubject=
//  Teacher only — scoped via Enrollment join.
// ─────────────────────────────────────────────────────────────────────────────
exports.listStudents = async (req, res, next) => {
    try {
        if (req.query.subject) {
            const err = new Error('?subject= is no longer supported — use ?teacherSubject= instead');
            err.statusCode = 422;
            return next(err);
        }

        const { page, limit, skip } = parsePagination(req.query);

        // Resolve which TeacherSubject IDs belong to this teacher
        let tsIds;
        if (req.query.teacherSubject) {
            const ts = await TeacherSubject.findOne({ _id: req.query.teacherSubject, teacher: req.token._id, isActive: true });
            if (!ts) {
                const err = new Error('TeacherSubject not found or not yours');
                err.statusCode = 404;
                return next(err);
            }
            tsIds = [ts._id];
        } else {
            const myTS = await TeacherSubject.find({ teacher: req.token._id, isActive: true }).select('_id');
            tsIds = myTS.map(t => t._id);
        }

        // Find distinct student IDs via active enrollments
        const enrollments = await Enrollment.find({ teacherSubject: { $in: tsIds }, isActive: true }).select('student');
        const studentIds = [...new Set(enrollments.map(e => e.student.toString()))];

        // Build student filter
        const filter = { _id: { $in: studentIds }, isActive: true };
        if (req.query.search) {
            const regex = new RegExp(req.query.search.trim(), 'i');
            filter.$or = [{ fullName: regex }, { studentNumber: regex }];
        }

        const [students, total] = await Promise.all([
            Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Student.countDocuments(filter),
        ]);

        // Attach enrollments scoped to this teacher's TeacherSubjects
        const enriched = await Promise.all(students.map(async (s) => {
            const myEnrollments = await Enrollment.find({
                student: s._id,
                teacherSubject: { $in: tsIds },
                isActive: true,
            }).populate({
                path: 'teacherSubject',
                select: 'subject',
                populate: { path: 'subject', select: 'name' },
            });
            return {
                ...s.toObject(),
                enrollments: myEnrollments.map(e => ({
                    _id: e._id,
                    teacherSubject: e.teacherSubject._id,
                    subject: e.teacherSubject.subject,
                })),
            };
        }));

        res.json({
            success: true,
            data: enriched,
            pagination: buildMeta({ page, limit, total }),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ONE STUDENT   GET /api/students/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getStudent = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            const err = new Error('Student not found');
            err.statusCode = 404;
            return next(err);
        }

        // Verify caller is the original teacher owner OR has an active enrollment
        const isOwner = student.teacher?.toString() === req.token._id;
        if (!isOwner) {
            const myTS = await TeacherSubject.find({ teacher: req.token._id, isActive: true }).select('_id');
            const hasEnrollment = await Enrollment.exists({
                student: student._id,
                teacherSubject: { $in: myTS.map(t => t._id) },
                isActive: true,
            });
            if (!hasEnrollment) {
                const err = new Error('Student not found');
                err.statusCode = 404;
                return next(err);
            }
        }

        res.json({ success: true, data: student });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE STUDENT   POST /api/students
//  Teacher only. studentNumber is auto-generated.
// ─────────────────────────────────────────────────────────────────────────────
exports.createStudent = async (req, res, next) => {
    try {
        const { fullName, address, phone, parentPhone, notes } = req.body;

        const student = await Student.create({
            fullName,
            address,
            phone,
            parentPhone,
            notes,
            teacher: req.token._id,
        });

        res.status(201).json({
            success: true,
            message: 'Student created successfully',
            data: student,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE STUDENT   PUT /api/students/:id
//  Teacher only. Must be the original owner.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateStudent = async (req, res, next) => {
    try {
        const student = await Student.findOne({ _id: req.params.id, teacher: req.token._id });
        if (!student) {
            const err = new Error('Student not found');
            err.statusCode = 404;
            return next(err);
        }

        const allowed = ['fullName', 'address', 'phone', 'parentPhone', 'notes', 'isActive'];
        for (const key of allowed) {
            if (req.body[key] !== undefined) student[key] = req.body[key];
        }

        await student.save();
        res.json({ success: true, message: 'Student updated successfully', data: student });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE STUDENT   DELETE /api/students/:id
//  Teacher only. Soft-delete + cascade enrollments.
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteStudent = async (req, res, next) => {
    try {
        const student = await Student.findOne({ _id: req.params.id, teacher: req.token._id });
        if (!student) {
            const err = new Error('Student not found');
            err.statusCode = 404;
            return next(err);
        }

        student.isActive = false;
        await student.save();

        await Enrollment.updateMany({ student: student._id }, { isActive: false });

        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (err) {
        next(err);
    }
};
