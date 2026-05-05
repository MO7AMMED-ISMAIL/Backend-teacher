// src/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
    {
        studentNumber: {
            type: String,
            required: [true, 'Student number is required'],
            unique: true,
            match: [/^\d{6}$/, 'Student number must be exactly 6 digits'],
        },

        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name must be at most 100 characters'],
        },

        address: {
            type: String,
            trim: true,
            maxlength: [200, 'Address must be at most 200 characters'],
            default: null,
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        parentPhone: {
            type: String,
            trim: true,
            default: null,
        },

        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher is required'],
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        notes: {
            type: String,
            trim: true,
            maxlength: [500, 'Notes must be at most 500 characters'],
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes (studentNumber unique index is declared via the field's `unique: true`)
studentSchema.index({ teacher: 1 });
studentSchema.index({ teacher: 1, fullName: 1 });

// Auto-generate 6-digit studentNumber before saving
studentSchema.pre('save', async function (next) {
    if (!this.isNew) return next();

    try {
        const last = await mongoose.model('Student')
            .findOne({})
            .sort({ studentNumber: -1 })
            .select('studentNumber');

        if (last && last.studentNumber) {
            const nextNum = parseInt(last.studentNumber, 10) + 1;
            this.studentNumber = String(nextNum).padStart(6, '0');
        } else {
            this.studentNumber = '100000';
        }
        next();
    } catch (err) {
        next(err);
    }
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
