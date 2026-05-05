/**
 * Rollback: v2 -> v1 (Multi-Teacher Subject Enrollment)
 * 
 * Logic:
 * 1. For each TeacherSubject:
 *    - Find the canonical Subject.
 *    - Create a new v1-style Subject(name: canonical.name, teacher: ts.teacher, ...).
 *    - Store mapping: teacherSubjectId -> v1SubjectId.
 * 2. Update Students:
 *    - Restore `subjects` array: find all Enrollments for the student where the teacher matches student.teacher.
 *    - Map these TeacherSubjects to the new v1SubjectIds.
 * 3. Update Schedules:
 *    - Restore `teacher` and `subject` using the TeacherSubject mapping.
 *    - Unset `teacherSubject`.
 * 4. Update Attendance:
 *    - Restore `teacher` and `subject` using the TeacherSubject mapping.
 *    - Unset `teacherSubject`.
 * 5. Cleanup:
 *    - Remove the "canonical" Subjects that were used in v2.
 *    - Remove TeacherSubject and Enrollment collections.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/teacher_db';

const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
const TeacherSubject = mongoose.model('TeacherSubject', new mongoose.Schema({}, { strict: false }));
const Enrollment = mongoose.model('Enrollment', new mongoose.Schema({}, { strict: false }));
const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }));
const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

async function rollback() {
    console.log('🔙 Starting rollback v2 -> v1...');
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const tsList = await TeacherSubject.find({}).populate('subject');
        console.log(`Found ${tsList.length} TeacherSubject assignments`);

        const tsToV1SubjectMap = new Map(); // teacherSubjectId -> v1SubjectId

        console.log('📦 Recreating v1-style subjects (per-teacher)...');
        for (const ts of tsList) {
            const v1Sub = await Subject.create({
                name: ts.subject.name,
                description: ts.subject.description,
                isActive: ts.isActive,
                teacher: ts.teacher
            });
            tsToV1SubjectMap.set(ts._id.toString(), v1Sub._id);
        }

        console.log('👥 Restoring student subjects array...');
        const students = await Student.find({});
        for (const student of students) {
            const enrollments = await Enrollment.find({ 
                student: student._id,
                isActive: true
            }).populate('teacherSubject');

            // In v1, student only saw subjects for THEIR teacher
            const mySubjects = enrollments
                .filter(e => e.teacherSubject.teacher.toString() === student.teacher.toString())
                .map(e => tsToV1SubjectMap.get(e.teacherSubject._id.toString()))
                .filter(id => !!id);

            await Student.updateOne(
                { _id: student._id },
                { $set: { subjects: mySubjects } }
            );
        }

        console.log('📅 Restoring schedules...');
        const schedules = await Schedule.find({ teacherSubject: { $exists: true } });
        for (const sch of schedules) {
            const v1SubId = tsToV1SubjectMap.get(sch.teacherSubject.toString());
            if (v1SubId) {
                const ts = tsList.find(t => t._id.toString() === sch.teacherSubject.toString());
                await Schedule.updateOne(
                    { _id: sch._id },
                    { 
                        $set: { 
                            teacher: ts.teacher,
                            subject: v1SubId
                        },
                        $unset: { teacherSubject: 1 }
                    }
                );
            }
        }

        console.log('📝 Restoring attendance...');
        const attendances = await Attendance.find({ teacherSubject: { $exists: true } });
        for (const att of attendances) {
            const v1SubId = tsToV1SubjectMap.get(att.teacherSubject.toString());
            if (v1SubId) {
                const ts = tsList.find(t => t._id.toString() === att.teacherSubject.toString());
                await Attendance.updateOne(
                    { _id: att._id },
                    { 
                        $set: { 
                            teacher: ts.teacher,
                            subject: v1SubId
                        },
                        $unset: { teacherSubject: 1 }
                    }
                );
            }
        }

        console.log('🧹 Cleaning up v2 collections...');
        // Remove global subjects (those without a teacher field)
        await Subject.deleteMany({ teacher: { $exists: false } });
        
        // Drop TeacherSubject and Enrollment collections
        await mongoose.connection.collection('teachersubjects').drop();
        await mongoose.connection.collection('enrollments').drop();

        console.log('✨ Rollback completed successfully');
    } catch (err) {
        console.error('❌ Rollback failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

rollback();
