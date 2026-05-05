// src/controllers/attendanceController.js
const mongoose       = require('mongoose');
const Attendance     = require('../models/Attendance');
const TeacherSubject = require('../models/TeacherSubject');
const Enrollment     = require('../models/Enrollment');
const { parsePagination, buildMeta } = require('../utils/paginate');

const summarize = (records = []) => {
    const summary = { total: records.length, present: 0, absent: 0, late: 0 };
    for (const r of records) summary[r.status] = (summary[r.status] || 0) + 1;
    return summary;
};

const normalizeDate = (d) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
};

// ─────────────────────────────────────────────────────────────────────────────
//  SUBMIT ATTENDANCE   POST /api/attendance
//  Upsert by (teacherSubject, date).
// ─────────────────────────────────────────────────────────────────────────────
exports.submitAttendance = async (req, res, next) => {
    try {
        const { teacherSubject, date, records } = req.body;

        const ts = await TeacherSubject.findOne({ _id: teacherSubject, teacher: req.token._id, isActive: true });
        if (!ts) {
            const err = new Error('TeacherSubject not found or not assigned to you');
            err.statusCode = 404;
            return next(err);
        }

        // Verify each student has an active enrollment for this teacherSubject
        const studentIds = records.map(r => r.student);
        const enrolledCount = await Enrollment.countDocuments({
            student: { $in: studentIds },
            teacherSubject,
            isActive: true,
        });
        if (enrolledCount !== studentIds.length) {
            const err = new Error('One or more students are not enrolled in this teacher-subject');
            err.statusCode = 422;
            return next(err);
        }

        const normalizedDate = normalizeDate(date);
        const filter = { teacherSubject, date: normalizedDate };
        const update = { $set: { records } };
        const opts   = { upsert: true, new: true, setDefaultsOnInsert: true };

        const existing = await Attendance.findOne(filter);
        const result = await Attendance.findOneAndUpdate(filter, update, opts)
            .populate({ path: 'teacherSubject', select: 'subject', populate: { path: 'subject', select: 'name' } })
            .populate('records.student', 'fullName studentNumber');

        res.status(existing ? 200 : 201).json({
            success: true,
            message: existing ? 'Attendance updated successfully' : 'Attendance saved successfully',
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  LIST ATTENDANCE   GET /api/attendance?teacherSubject=&from=&to=&page=&limit=
// ─────────────────────────────────────────────────────────────────────────────
exports.listAttendance = async (req, res, next) => {
    try {
        if (req.query.subject) {
            const err = new Error('?subject= is no longer supported — use ?teacherSubject= instead');
            err.statusCode = 422;
            return next(err);
        }

        const { page, limit, skip } = parsePagination(req.query);

        const myTS = await TeacherSubject.find({ teacher: req.token._id, isActive: true }).select('_id');
        const tsIds = myTS.map(t => t._id);

        const filter = { teacherSubject: { $in: tsIds } };
        if (req.query.teacherSubject) filter.teacherSubject = req.query.teacherSubject;

        if (req.query.from || req.query.to) {
            filter.date = {};
            if (req.query.from) filter.date.$gte = normalizeDate(req.query.from);
            if (req.query.to) {
                const to = normalizeDate(req.query.to);
                to.setHours(23, 59, 59, 999);
                filter.date.$lte = to;
            }
        }

        const [records, total] = await Promise.all([
            Attendance.find(filter)
                .populate({ path: 'teacherSubject', select: 'subject', populate: { path: 'subject', select: 'name' } })
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit),
            Attendance.countDocuments(filter),
        ]);

        const data = records.map(r => ({
            _id: r._id,
            teacherSubject: r.teacherSubject,
            date: r.date,
            summary: summarize(r.records),
        }));

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
//  GET ATTENDANCE SUMMARY   GET /api/attendance/summary?teacherSubject=
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttendanceSummary = async (req, res, next) => {
    try {
        if (req.query.subject) {
            const err = new Error('?subject= is no longer supported — use ?teacherSubject= instead');
            err.statusCode = 422;
            return next(err);
        }

        const { teacherSubject } = req.query;
        if (!teacherSubject) {
            const err = new Error('teacherSubject is required');
            err.statusCode = 422;
            return next(err);
        }

        const ts = await TeacherSubject.findOne({ _id: teacherSubject, teacher: req.token._id, isActive: true });
        if (!ts) {
            const err = new Error('TeacherSubject not found or not assigned to you');
            err.statusCode = 404;
            return next(err);
        }

        const tsId = new mongoose.Types.ObjectId(teacherSubject);

        const summary = await Attendance.aggregate([
            { $match: { teacherSubject: tsId } },
            { $unwind: '$records' },
            {
                $group: {
                    _id: '$records.student',
                    totalSessions: { $sum: 1 },
                    present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
                    absent:  { $sum: { $cond: [{ $eq: ['$records.status', 'absent']  }, 1, 0] } },
                    late:    { $sum: { $cond: [{ $eq: ['$records.status', 'late']    }, 1, 0] } },
                },
            },
            {
                $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' },
            },
            { $unwind: '$student' },
            {
                $project: {
                    _id: 0,
                    student: { _id: '$student._id', fullName: '$student.fullName', studentNumber: '$student.studentNumber' },
                    totalSessions: 1, present: 1, absent: 1, late: 1,
                    attendanceRate: {
                        $cond: [
                            { $eq: ['$totalSessions', 0] }, 0,
                            { $round: [{ $multiply: [{ $divide: ['$present', '$totalSessions'] }, 100] }, 1] },
                        ],
                    },
                },
            },
            { $sort: { 'student.fullName': 1 } },
        ]);

        res.json({ success: true, data: summary });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ONE ATTENDANCE   GET /api/attendance/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttendance = async (req, res, next) => {
    try {
        const record = await Attendance.findById(req.params.id)
            .populate({ path: 'teacherSubject', select: 'teacher subject', populate: { path: 'subject', select: 'name' } })
            .populate('records.student', 'fullName studentNumber');

        if (!record || record.teacherSubject?.teacher?.toString() !== req.token._id) {
            const err = new Error('Attendance record not found');
            err.statusCode = 404;
            return next(err);
        }

        res.json({ success: true, data: record });
    } catch (err) {
        next(err);
    }
};
