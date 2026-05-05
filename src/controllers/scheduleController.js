// src/controllers/scheduleController.js
const Schedule       = require('../models/Schedule');
const TeacherSubject = require('../models/TeacherSubject');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

const overlaps = (aStart, aEnd, bStart, bEnd) =>
    toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);

const findOverlaps = async (teacherId, dayOfWeek, startTime, endTime, excludeId = null) => {
    const myTS = await TeacherSubject.find({ teacher: teacherId, isActive: true }).select('_id');
    const tsIds = myTS.map(t => t._id);

    const filter = { teacherSubject: { $in: tsIds }, dayOfWeek, isActive: true };
    if (excludeId) filter._id = { $ne: excludeId };

    const existing = await Schedule.find(filter).populate({
        path: 'teacherSubject',
        select: 'subject',
        populate: { path: 'subject', select: 'name' },
    });

    return existing
        .filter(s => overlaps(startTime, endTime, s.startTime, s.endTime))
        .map(s => `Time overlap with ${s.teacherSubject?.subject?.name || 'subject'} (${s.startTime}-${s.endTime}) on ${DAY_NAMES[dayOfWeek]}`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  LIST SCHEDULES   GET /api/schedules?dayOfWeek=
// ─────────────────────────────────────────────────────────────────────────────
exports.listSchedules = async (req, res, next) => {
    try {
        const myTS = await TeacherSubject.find({ teacher: req.token._id, isActive: true }).select('_id');
        const tsIds = myTS.map(t => t._id);

        const filter = { teacherSubject: { $in: tsIds }, isActive: true };
        if (req.query.dayOfWeek !== undefined) filter.dayOfWeek = parseInt(req.query.dayOfWeek, 10);

        const schedules = await Schedule.find(filter)
            .populate({ path: 'teacherSubject', select: 'subject', populate: { path: 'subject', select: 'name' } })
            .sort({ dayOfWeek: 1, startTime: 1 });

        res.json({ success: true, data: schedules });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ONE SCHEDULE   GET /api/schedules/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate({ path: 'teacherSubject', select: 'teacher subject', populate: { path: 'subject', select: 'name' } });

        if (!schedule || schedule.teacherSubject?.teacher?.toString() !== req.token._id) {
            const err = new Error('Schedule not found');
            err.statusCode = 404;
            return next(err);
        }

        res.json({ success: true, data: schedule });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE SCHEDULE   POST /api/schedules
// ─────────────────────────────────────────────────────────────────────────────
exports.createSchedule = async (req, res, next) => {
    try {
        const { teacherSubject, dayOfWeek, startTime, endTime } = req.body;

        const ts = await TeacherSubject.findOne({ _id: teacherSubject, teacher: req.token._id, isActive: true });
        if (!ts) {
            const err = new Error('TeacherSubject not found or not assigned to you');
            err.statusCode = 404;
            return next(err);
        }

        const warnings = await findOverlaps(req.token._id, dayOfWeek, startTime, endTime);

        const schedule = await Schedule.create({ teacherSubject, dayOfWeek, startTime, endTime });
        const populated = await schedule.populate({
            path: 'teacherSubject',
            select: 'subject teacher',
            populate: { path: 'subject', select: 'name' },
        });

        res.status(201).json({
            success: true,
            message: 'Schedule created successfully',
            data: populated,
            ...(warnings.length > 0 && { warnings }),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE SCHEDULE   PUT /api/schedules/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.updateSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('teacherSubject', 'teacher');

        if (!schedule || schedule.teacherSubject?.teacher?.toString() !== req.token._id) {
            const err = new Error('Schedule not found');
            err.statusCode = 404;
            return next(err);
        }

        if (req.body.teacherSubject && req.body.teacherSubject !== schedule.teacherSubject._id.toString()) {
            const ts = await TeacherSubject.findOne({ _id: req.body.teacherSubject, teacher: req.token._id, isActive: true });
            if (!ts) {
                const err = new Error('TeacherSubject not found or not assigned to you');
                err.statusCode = 404;
                return next(err);
            }
        }

        const allowed = ['teacherSubject', 'dayOfWeek', 'startTime', 'endTime', 'isActive'];
        for (const key of allowed) {
            if (req.body[key] !== undefined) schedule[key] = req.body[key];
        }

        const warnings = await findOverlaps(req.token._id, schedule.dayOfWeek, schedule.startTime, schedule.endTime, schedule._id);

        await schedule.save();
        const populated = await schedule.populate({
            path: 'teacherSubject',
            select: 'subject teacher',
            populate: { path: 'subject', select: 'name' },
        });

        res.json({
            success: true,
            message: 'Schedule updated successfully',
            data: populated,
            ...(warnings.length > 0 && { warnings }),
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE SCHEDULE   DELETE /api/schedules/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('teacherSubject', 'teacher');

        if (!schedule || schedule.teacherSubject?.teacher?.toString() !== req.token._id) {
            const err = new Error('Schedule not found');
            err.statusCode = 404;
            return next(err);
        }

        await schedule.deleteOne();
        res.json({ success: true, message: 'Schedule deleted successfully' });
    } catch (err) {
        next(err);
    }
};
