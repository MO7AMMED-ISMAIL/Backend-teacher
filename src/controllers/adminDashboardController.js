// src/controllers/adminDashboardController.js
const mongoose       = require('mongoose');
const User           = require('../models/User');
const Subject        = require('../models/Subject');
const TeacherSubject = require('../models/TeacherSubject');
const Student        = require('../models/Student');
const Enrollment     = require('../models/Enrollment');
const Schedule       = require('../models/Schedule');
const Attendance     = require('../models/Attendance');

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/admin/dashboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getAdminDashboard = async (req, res, next) => {
    try {
        const todayDayOfWeek = new Date().getDay();

        const [
            teachersActive, teachersInactive,
            subjectsActive, subjectsInactive,
            assignmentsActive, assignmentsInactive,
            studentsActive, studentsInactive,
            enrollmentsActive, enrollmentsInactive,
            todayClassesCount,
            attendanceAgg,
            teachersWithoutSubjects,
            subjectsWithoutTeachers,
        ] = await Promise.all([
            User.countDocuments({ role: 'teacher', isActive: true }),
            User.countDocuments({ role: 'teacher', isActive: false }),
            Subject.countDocuments({ isActive: true }),
            Subject.countDocuments({ isActive: false }),
            TeacherSubject.countDocuments({ isActive: true }),
            TeacherSubject.countDocuments({ isActive: false }),
            Student.countDocuments({ isActive: true }),
            Student.countDocuments({ isActive: false }),
            Enrollment.countDocuments({ isActive: true }),
            Enrollment.countDocuments({ isActive: false }),
            Schedule.countDocuments({ isActive: true, dayOfWeek: todayDayOfWeek }),
            Attendance.aggregate([
                { $unwind: '$records' },
                {
                    $group: {
                        _id: null,
                        total:   { $sum: 1 },
                        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
                    },
                },
            ]),
            // Teachers with zero active TeacherSubject assignments
            User.aggregate([
                { $match: { role: 'teacher', isActive: true } },
                {
                    $lookup: {
                        from: 'teachersubjects',
                        let: { tid: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $and: [{ $eq: ['$teacher', '$$tid'] }, { $eq: ['$isActive', true] }] } } },
                        ],
                        as: 'assignments',
                    },
                },
                { $match: { assignments: { $size: 0 } } },
                { $project: { _id: 1, name: 1 } },
                { $limit: 10 },
            ]),
            // Subjects with zero active TeacherSubject assignments
            Subject.aggregate([
                { $match: { isActive: true } },
                {
                    $lookup: {
                        from: 'teachersubjects',
                        let: { sid: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $and: [{ $eq: ['$subject', '$$sid'] }, { $eq: ['$isActive', true] }] } } },
                        ],
                        as: 'assignments',
                    },
                },
                { $match: { assignments: { $size: 0 } } },
                { $project: { _id: 1, name: 1 } },
                { $limit: 10 },
            ]),
        ]);

        const overall = attendanceAgg[0];
        const overallAttendanceRate = overall && overall.total > 0
            ? Math.round((overall.present / overall.total) * 1000) / 10
            : 0;

        res.json({
            success: true,
            data: {
                totals: {
                    teachers:    { active: teachersActive,    inactive: teachersInactive },
                    subjects:    { active: subjectsActive,    inactive: subjectsInactive },
                    assignments: { active: assignmentsActive, inactive: assignmentsInactive },
                    students:    { active: studentsActive,    inactive: studentsInactive },
                    enrollments: { active: enrollmentsActive, inactive: enrollmentsInactive },
                },
                todayClassesCount,
                overallAttendanceRate,
                alerts: {
                    teachersWithoutSubjects,
                    subjectsWithoutTeachers,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};
