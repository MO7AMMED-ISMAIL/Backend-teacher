// src/models/TeacherSubject.js
const mongoose = require('mongoose');

const teacherSubjectSchema = new mongoose.Schema(
    {
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher is required'],
        },

        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: [true, 'Subject is required'],
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

// One active or inactive assignment per (teacher, subject) pair
teacherSubjectSchema.index({ teacher: 1, subject: 1 }, { unique: true });
teacherSubjectSchema.index({ teacher: 1, isActive: 1 });
teacherSubjectSchema.index({ subject: 1, isActive: 1 });

const TeacherSubject = mongoose.model('TeacherSubject', teacherSubjectSchema);

module.exports = TeacherSubject;
