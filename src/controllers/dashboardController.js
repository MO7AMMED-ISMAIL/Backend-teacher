// src/controllers/dashboardController.js
const mongoose       = require('mongoose');
const TeacherSubject = require('../models/TeacherSubject');
const Enrollment     = require('../models/Enrollment');
const Schedule       = require('../models/Schedule');
const Attendance     = require('../models/Attendance');

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/dashboard/teacher
//  Aggregated summary for the authenticated teacher. Output shape unchanged
//  from feature 001 — data now sourced from v2 collections.
// ─────────────────────────────────────────────────────────────────────────────
exports.getTeacherDashboard = async (req, res, next) => {
    try {
        const teacherId = new mongoose.Types.ObjectId(req.token._id);
        const todayDayOfWeek = new Date().getDay();

        // Active TeacherSubject IDs for this teacher
        const myTS = await TeacherSubject.find({ teacher: teacherId, isActive: true }).select('_id');
        const tsIds = myTS.map(t => t._id);

        const [
            totalStudents,
            totalSubjects,
            todayClasses,
            attendanceAgg,
            recentAttendance,
        ] = await Promise.all([
            // Distinct active students via Enrollment
            Enrollment.distinct('student', { teacherSubject: { $in: tsIds }, isActive: true })
                .then(ids => ids.length),
            // Count of active TeacherSubjects
            Promise.resolve(tsIds.length),
            // Today's schedule entries
            Schedule.find({ teacherSubject: { $in: tsIds }, dayOfWeek: todayDayOfWeek, isActive: true })
                .populate({ path: 'teacherSubject', select: 'subject', populate: { path: 'subject', select: 'name' } })
                .sort({ startTime: 1 })
                .lean(),
            // Overall attendance rate
            Attendance.aggregate([
                { $match: { teacherSubject: { $in: tsIds } } },
                { $unwind: '$records' },
                {
                    $group: {
                        _id: null,
                        total:   { $sum: 1 },
                        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
                    },
                },
            ]),
            // Recent attendance
            Attendance.find({ teacherSubject: { $in: tsIds } })
                .populate({ path: 'teacherSubject', select: 'subject', populate: { path: 'subject', select: 'name' } })
                .sort({ date: -1 })
                .limit(5)
                .lean(),
        ]);

        const overall = attendanceAgg[0];
        const overallAttendanceRate = overall && overall.total > 0
            ? Math.round((overall.present / overall.total) * 1000) / 10
            : 0;

        const recent = recentAttendance.map(r => ({
            _id: r._id,
            subject: r.teacherSubject?.subject,
            date: r.date,
            presentCount: (r.records || []).filter(rec => rec.status === 'present').length,
            totalCount: (r.records || []).length,
        }));

        res.json({
            success: true,
            data: {
                totalStudents,
                totalSubjects,
                todayClasses: todayClasses.map(c => ({
                    _id: c._id,
                    subject: c.teacherSubject?.subject,
                    teacherSubject: c.teacherSubject,
                    startTime: c.startTime,
                    endTime: c.endTime,
                })),
                overallAttendanceRate,
                recentAttendance: recent,
            },
        });
    } catch (err) {
        next(err);
    }
};
