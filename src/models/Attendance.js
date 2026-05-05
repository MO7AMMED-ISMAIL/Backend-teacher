// src/models/Attendance.js
const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = ['present', 'absent', 'late'];

const recordSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        status: {
            type: String,
            enum: ATTENDANCE_STATUSES,
            required: true,
        },
    },
    { _id: false },
);

const attendanceSchema = new mongoose.Schema(
    {
        teacherSubject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherSubject',
            required: [true, 'TeacherSubject is required'],
        },

        date: {
            type: Date,
            required: [true, 'Date is required'],
        },

        records: {
            type: [recordSchema],
            validate: [
                (arr) => Array.isArray(arr) && arr.length > 0,
                'Records cannot be empty',
            ],
        },
    },
    {
        timestamps: true,
    }
);

// One attendance record per (teacherSubject, date)
attendanceSchema.index({ teacherSubject: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
