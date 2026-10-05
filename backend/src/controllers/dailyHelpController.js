const DailyHelp = require('../models/DailyHelp');
const HelpAttendance = require('../models/HelpAttendance');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generatePasscode } = require('../utils/passcode');
const { notifyFlat } = require('../utils/notify');

const today = () => new Date().toISOString().slice(0, 10);

/* ============ FEATURE 3: Daily help (maid / cook / driver) with passcode + attendance ============ */

// POST /api/daily-help  (resident/admin)  { name, phone, type }
// If a worker with same phone already exists in society, just attach the flat.
exports.create = asyncHandler(async (req, res) => {
  const { name, phone, type } = req.body;
  let help = await DailyHelp.findOne({ society: req.user.society, phone });

  if (help) {
    if (req.user.flatNo && !help.flats.includes(req.user.flatNo)) {
      help.flats.push(req.user.flatNo);
      await help.save();
    }
    return res.json({ help, message: 'Existing worker linked to your flat' });
  }

  let passcode;
  do {
    passcode = generatePasscode();
  } while (await DailyHelp.exists({ society: req.user.society, passcode }));

  help = await DailyHelp.create({
    society: req.user.society,
    name,
    phone,
    type,
    passcode,
    flats: req.user.flatNo ? [req.user.flatNo] : [],
    addedBy: req.user._id,
  });
  res.status(201).json({ help });
});

// GET /api/daily-help   resident -> own flat workers; guard/admin -> all
exports.list = asyncHandler(async (req, res) => {
  const filter = { society: req.user.society, active: true };
  if (req.user.role === 'resident') filter.flats = req.user.flatNo;
  const helps = await DailyHelp.find(filter).sort({ name: 1 });
  res.json({ helps });
});

// DELETE /api/daily-help/:id  (resident removes worker from own flat)
exports.unlink = asyncHandler(async (req, res) => {
  const help = await DailyHelp.findOne({ _id: req.params.id, society: req.user.society });
  if (!help) return res.status(404).json({ message: 'Worker not found' });
  help.flats = help.flats.filter((f) => f !== req.user.flatNo);
  if (help.flats.length === 0 && req.user.role !== 'admin') help.active = false;
  await help.save();
  res.json({ help });
});

// POST /api/daily-help/checkin  (guard)  { passcode }  -> marks entry
exports.checkIn = asyncHandler(async (req, res) => {
  const help = await DailyHelp.findOne({ society: req.user.society, passcode: req.body.passcode, active: true });
  if (!help) return res.status(404).json({ message: 'Invalid passcode' });
  if (help.isInside) return res.status(400).json({ message: `${help.name} is already inside` });

  const attendance = await HelpAttendance.create({
    society: req.user.society,
    help: help._id,
    date: today(),
    inTime: new Date(),
    markedBy: req.user._id,
  });
  help.isInside = true;
  await help.save();

  await Promise.all(
    help.flats.map((flatNo) =>
      notifyFlat(User, req.user.society, flatNo, {
        title: `${help.name} arrived`,
        message: `Your ${help.type.replace('_', ' ')} ${help.name} entered the society at ${attendance.inTime.toLocaleTimeString()}.`,
        type: 'daily_help',
        data: { helpId: help._id },
      })
    )
  );
  res.json({ help, attendance });
});

// POST /api/daily-help/checkout  (guard)  { passcode }  -> marks exit
exports.checkOut = asyncHandler(async (req, res) => {
  const help = await DailyHelp.findOne({ society: req.user.society, passcode: req.body.passcode, active: true });
  if (!help) return res.status(404).json({ message: 'Invalid passcode' });
  if (!help.isInside) return res.status(400).json({ message: `${help.name} is not inside` });

  const attendance = await HelpAttendance.findOne({ help: help._id, outTime: null }).sort({ inTime: -1 });
  if (attendance) {
    attendance.outTime = new Date();
    await attendance.save();
  }
  help.isInside = false;
  await help.save();

  await Promise.all(
    help.flats.map((flatNo) =>
      notifyFlat(User, req.user.society, flatNo, {
        title: `${help.name} left`,
        message: `Your ${help.type.replace('_', ' ')} ${help.name} left the society.`,
        type: 'daily_help',
        data: { helpId: help._id },
      })
    )
  );
  res.json({ help, attendance });
});

// GET /api/daily-help/:id/attendance?month=YYYY-MM
exports.attendance = asyncHandler(async (req, res) => {
  const help = await DailyHelp.findOne({ _id: req.params.id, society: req.user.society });
  if (!help) return res.status(404).json({ message: 'Worker not found' });
  const month = req.query.month || today().slice(0, 7);
  const rows = await HelpAttendance.find({ help: help._id, date: { $regex: `^${month}` } }).sort({ inTime: -1 });
  const daysPresent = new Set(rows.map((r) => r.date)).size;
  res.json({ help, month, daysPresent, attendance: rows });
});
