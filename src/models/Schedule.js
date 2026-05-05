// src/models/Schedule.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
    {
        teacherSubject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherSubject',
            required: [true, 'TeacherSubject is required'],
        },

        dayOfWeek: {
            type: Number,
            required: [true, 'Day of week is required'],
            min: [0, 'Day of week must be 0-6'],
            max: [6, 'Day of week must be 0-6'],
        },

        startTime: {
            type: String,
            required: [true, 'Start time is required'],
            match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'],
        },

        endTime: {
            type: String,
            required: [true, 'End time is required'],
            match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'],
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

scheduleSchema.index({ teacherSubject: 1, dayOfWeek: 1 });
scheduleSchema.index({ teacherSubject: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
