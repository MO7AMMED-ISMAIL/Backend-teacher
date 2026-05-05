// src/models/Enrollment.js
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: [true, 'Student is required'],
        },

        teacherSubject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherSubject',
            required: [true, 'TeacherSubject is required'],
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// One active or inactive enrollment per (student, teacherSubject) pair
enrollmentSchema.index({ student: 1, teacherSubject: 1 }, { unique: true });
enrollmentSchema.index({ teacherSubject: 1, isActive: 1 });
enrollmentSchema.index({ student: 1, isActive: 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
