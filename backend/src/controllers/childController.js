const Child = require('../models/Child');
const ChildLog = require('../models/ChildLog');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { notifyFlat } = require('../utils/notify');

/* ============ FEATURE 8: Kid safety (exit/entry alerts to parents) ============ */

// POST /api/children  (resident)  { name, age, allowedEscorts: [] }
exports.create = asyncHandler(async (req, res) => {
  const { name, age, allowedEscorts = [] } = req.body;
  const child = await Child.create({
    society: req.user.society,
    flatNo: req.user.flatNo,
    parent: req.user._id,
    name,
    age,
    allowedEscorts,
  });
  res.status(201).json({ child });
});

// GET /api/children   resident -> own flat; guard/admin -> all (guard needs this to log)
exports.list = asyncHandler(async (req, res) => {
  const filter = { society: req.user.society };
  if (req.user.role === 'resident') filter.flatNo = req.user.flatNo;
  if (req.query.flatNo && req.user.role !== 'resident') filter.flatNo = req.query.flatNo;
  const children = await Child.find(filter).populate('parent', 'name phone').sort({ flatNo: 1, name: 1 });
  res.json({ children });
});

// PUT /api/children/:id  (parent)  { name, age, allowedEscorts }
exports.update = asyncHandler(async (req, res) => {
  const child = await Child.findOneAndUpdate(
    { _id: req.params.id, society: req.user.society, flatNo: req.user.flatNo },
    { name: req.body.name, age: req.body.age, allowedEscorts: req.body.allowedEscorts },
    { new: true, runValidators: true }
  );
  if (!child) return res.status(404).json({ message: 'Child not found' });
  res.json({ child });
});

// DELETE /api/children/:id  (parent)
exports.remove = asyncHandler(async (req, res) => {
  const child = await Child.findOneAndDelete({ _id: req.params.id, society: req.user.society, flatNo: req.user.flatNo });
  if (!child) return res.status(404).json({ message: 'Child not found' });
  res.json({ message: 'Removed' });
});

// POST /api/children/:id/log  (guard)  { action: 'exit'|'entry', escort, note }
exports.log = asyncHandler(async (req, res) => {
  const { action, escort, note } = req.body;
  if (!['exit', 'entry'].includes(action)) return res.status(400).json({ message: 'action must be exit or entry' });
  const child = await Child.findOne({ _id: req.params.id, society: req.user.society });
  if (!child) return res.status(404).json({ message: 'Child not found' });

  if (action === 'exit' && !child.isInside) return res.status(400).json({ message: `${child.name} is already outside` });
  if (action === 'entry' && child.isInside) return res.status(400).json({ message: `${child.name} is already inside` });

  const escortAllowed = child.allowedEscorts.length === 0 || child.allowedEscorts.some((e) => e.toLowerCase() === String(escort).toLowerCase());

  const entry = await ChildLog.create({
    society: req.user.society,
    child: child._id,
    action,
    escort,
    note,
    loggedBy: req.user._id,
  });
  child.isInside = action === 'entry';
  await child.save();

  const time = entry.at.toLocaleTimeString();
  await notifyFlat(User, req.user.society, child.flatNo, {
    title: action === 'exit' ? `${child.name} left the society` : `${child.name} is back home`,
    message:
      action === 'exit'
        ? `${child.name} went out with ${escort} at ${time}.${escortAllowed ? '' : ' WARNING: escort not in your allowed list!'}`
        : `${child.name} returned with ${escort} at ${time}.`,
    type: 'child',
    data: { childId: child._id, logId: entry._id, escortAllowed },
  });

  res.status(201).json({ child, log: entry, escortAllowed });
});

// GET /api/children/:id/logs
exports.logs = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, society: req.user.society };
  if (req.user.role === 'resident') filter.flatNo = req.user.flatNo;
  const child = await Child.findOne(filter);
  if (!child) return res.status(404).json({ message: 'Child not found' });
  const logs = await ChildLog.find({ child: child._id }).populate('loggedBy', 'name').sort({ at: -1 }).limit(100);
  res.json({ child, logs });
});
