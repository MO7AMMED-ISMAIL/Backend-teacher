// src/utils/seed.js
// ─────────────────────────────────────────────────────────────────────────────
// Run once to populate the DB with test users:
//   node src/utils/seed.js
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const users = [
    {
        name: 'Super Admin',
        email: 'admin@school.com',
        password: 'Admin123',
        role: 'admin',
    },
    {
        name: 'Ahmed Hassan',
        email: 'teacher@school.com',
        password: 'Teacher123',
        role: 'teacher',
        subject: 'Mathematics',
        department: 'Science',
    },
    {
        name: 'Ali Youssef',
        email: 'student@school.com',
        password: 'Student123',
        role: 'student',
        grade: 'Grade 10',
        studentId: 'STU-001',
    },
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing users
        await User.deleteMany({});
        console.log('🗑️  Cleared existing users');

        // Create fresh
        const created = await User.insertMany(users);  // Note: won't hash via pre-save hook with insertMany
        console.log(`⚠️  Use create() for password hashing. Seeding individually...`);

        // Use create() so pre-save hook hashes passwords
        await User.deleteMany({});
        for (const u of users) {
            await User.create(u);
            console.log(`✅  Created ${u.role}: ${u.email}`);
        }

        console.log('\n─────────────────────────────────────');
        console.log('🌱 Seed complete! Test credentials:');
        console.log('   Admin:   admin@school.com   / Admin123');
        console.log('   Teacher: teacher@school.com / Teacher123');
        console.log('   Student: student@school.com / Student123');
        console.log('─────────────────────────────────────');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
};

seed();