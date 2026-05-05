/**
 * Migration: v1 -> v2 (Multi-Teacher Subject Enrollment)
 * 
 * Step-by-step logic:
 * 1. Load all v1 Subjects.
 * 2. Identify unique subjects by name (case-insensitive).
 * 3. For each unique name:
 *    - Pick one "canonical" Subject document to keep.
 *    - Find all v1 Subjects with this name.
 *    - For each such v1 Subject, create a TeacherSubject(teacher, canonicalSubject).
 *    - Store a mapping: { oldSubjectId: newTeacherSubjectId, oldSubjectId_to_canonicalSubjectId: canonicalSubjectId }
 * 4. Update Students:
 *    - For each Student:
 *      - For each subjectId in student.subjects:
 *        - Look up the TeacherSubject using (Student.teacher, subjectId).
 *        - Create an Enrollment(student, teacherSubject).
 * 5. Update Schedules:
 *    - For each Schedule:
 *      - Find TeacherSubject using (Schedule.teacher, Schedule.subject).
 *      - Update Schedule.teacherSubject = teacherSubject._id.
 *      - Unset Schedule.teacher and Schedule.subject.
 * 6. Update Attendance:
 *    - For each Attendance:
 *      - Find TeacherSubject using (Attendance.teacher, Attendance.subject).
 *      - Update Attendance.teacherSubject = teacherSubject._id.
 *      - Unset Attendance.teacher and Attendance.subject.
 * 7. Cleanup Subjects:
 *    - Remove Subjects that are not "canonical".
 *    - Remove 'teacher' field from remaining Subjects.
 * 8. Cleanup Students:
 *    - Remove 'subjects' field from all Students.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/teacher_db';

// Temporary models for migration (since current models might have strict schemas)
const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
const TeacherSubject = mongoose.model('TeacherSubject', new mongoose.Schema({}, { strict: false }));
const Enrollment = mongoose.model('Enrollment', new mongoose.Schema({}, { strict: false }));
const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }));
const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

async function migrate() {
    console.log('🚀 Starting migration v1 -> v2...');
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1 & 2. Load and group subjects
        const allSubjects = await Subject.find({});
        console.log(`Found ${allSubjects.length} subjects in v1`);

        const subjectsByName = {};
        allSubjects.forEach(s => {
            const key = s.name.toLowerCase().trim();
            if (!subjectsByName[key]) subjectsByName[key] = [];
            subjectsByName[key].push(s);
        });

        const canonicalMap = new Map(); // oldSubjectId -> canonicalSubjectId
        const tsMap = new Map(); // (teacherId, oldSubjectId) -> teacherSubjectId

        console.log('📦 Creating TeacherSubject assignments and merging subjects...');

        for (const nameKey in subjectsByName) {
            const group = subjectsByName[nameKey];
            const canonical = group[0]; // Keep the first one as canonical
            
            for (const s of group) {
                canonicalMap.set(s._id.toString(), canonical._id);

                if (s.teacher) {
                    // Create TeacherSubject
                    const ts = await TeacherSubject.findOneAndUpdate(
                        { teacher: s.teacher, subject: canonical._id },
                        { $set: { isActive: s.isActive || true } },
                        { upsert: true, new: true }
                    );
                    tsMap.set(`${s.teacher.toString()}_${s._id.toString()}`, ts._id);
                }
            }
        }

        // 4. Update Students -> Enrollments
        console.log('👥 Migrating student enrollments...');
        const students = await Student.find({ subjects: { $exists: true, $not: { $size: 0 } } });
        for (const student of students) {
            for (const oldSubId of student.subjects) {
                const tsId = tsMap.get(`${student.teacher.toString()}_${oldSubId.toString()}`);
                if (tsId) {
                    await Enrollment.findOneAndUpdate(
                        { student: student._id, teacherSubject: tsId },
                        { $set: { isActive: student.isActive || true } },
                        { upsert: true }
                    );
                } else {
                    console.warn(`⚠️  Orphan enrollment found: Student ${student.fullName} has subject ${oldSubId} but no TeacherSubject found.`);
                }
            }
        }

        // 5. Update Schedules
        console.log('📅 Updating schedules...');
        const schedules = await Schedule.find({ subject: { $exists: true } });
        for (const sch of schedules) {
            const tsId = tsMap.get(`${sch.teacher.toString()}_${sch.subject.toString()}`);
            if (tsId) {
                await Schedule.updateOne(
                    { _id: sch._id },
                    { 
                        $set: { teacherSubject: tsId },
                        $unset: { teacher: 1, subject: 1 }
                    }
                );
            }
        }

        // 6. Update Attendance
        console.log('📝 Updating attendance records...');
        const attendances = await Attendance.find({ subject: { $exists: true } });
        for (const att of attendances) {
            const tsId = tsMap.get(`${att.teacher.toString()}_${att.subject.toString()}`);
            if (tsId) {
                await Attendance.updateOne(
                    { _id: att._id },
                    { 
                        $set: { teacherSubject: tsId },
                        $unset: { teacher: 1, subject: 1 }
                    }
                );
            }
        }

        // 7. Cleanup Subjects
        console.log('🧹 Cleaning up Subject collection...');
        const canonicalIds = Array.from(new Set(canonicalMap.values()));
        await Subject.deleteMany({ _id: { $nin: canonicalIds } });
        await Subject.updateMany({}, { $unset: { teacher: 1 } });

        // 8. Cleanup Students
        console.log('🧹 Cleaning up Student collection...');
        await Student.updateMany({}, { $unset: { subjects: 1 } });

        console.log('✨ Migration completed successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
