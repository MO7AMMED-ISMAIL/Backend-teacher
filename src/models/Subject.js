// src/models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Subject name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name must be at most 100 characters'],
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description must be at most 500 characters'],
            default: null,
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

// Globally unique subject names (case-insensitive)
subjectSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
