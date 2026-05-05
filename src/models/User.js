// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'teacher', 'student'];

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [60, 'Name must be at most 60 characters'],
        },

        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },

        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,  // never returned in queries by default
        },

        role: {
            type: String,
            enum: ROLES,
            default: 'student',
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // ── Extra fields per role ──────────────────────────────
        // Teacher-specific
        subject: { type: String, default: null },
        department: { type: String, default: null },

        // Student-specific
        grade: { type: String, default: null },
        studentId: { type: String, default: null },

        // Shared optional
        phone: { type: String, default: null },
        avatar: { type: String, default: null },

        lastLogin: { type: Date, default: null },
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);

// ── Hash password before saving ────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ── Instance method: compare plain password with hash ──────
userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

// ── Remove sensitive fields from JSON output ───────────────
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;