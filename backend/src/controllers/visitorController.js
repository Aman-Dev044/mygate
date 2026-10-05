const Visitor = require('../models/Visitor');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generatePasscode } = require('../utils/passcode');
const { notifyFlat, notifyUser } = require('../utils/notify');
const { getIO } = require('../socket');

const emitToGuards = (societyId, event, payload) => {
  try {
    getIO().to(`guards:${societyId}`).emit(event, payload);
  } catch (_) {
    /* socket not ready */
  }
};

const typeLabel = { delivery: 'Delivery', cab: 'Cab', service: 'Service person', guest: 'Guest', other: 'Visitor' };

/* ============ FEATURE 1: Visitor entry approval (guard -> resident) ============ */

// POST /api/visitors/gate  (guard)  { flatNo, name, phone, type, company, vehicleNo, purpose }
exports.createAtGate = asyncHandler(async (req, res) => {
  const { flatNo, name, phone, type = 'guest', company, vehicleNo, purpose } = req.body;
  const flatExists = await User.exists({ society: req.user.society, flatNo, role: 'resident' });
  if (!flatExists) return res.status(404).json({ message: `No resident found for flat ${flatNo}` });

  const visitor = await Visitor.create({
    society: req.user.society,
    flatNo,
    name,
    phone,
    type,
    company,
    vehicleNo,
    purpose,
    status: 'pending',
    createdBy: req.user._id,
  });

  const who = company ? `${name} (${company})` : name;
  await notifyFlat(User, req.user.society, flatNo, {
    title: `${typeLabel[type] || 'Visitor'} at gate`,
    message: `${who} is waiting at the gate. Allow or Deny?`,
    type: 'visitor',
    data: { visitorId: visitor._id, action: 'approve_request' },
  });

  res.status(201).json({ visitor });
});

// PATCH /api/visitors/:id/respond  (resident)  { action: 'approve' | 'deny' }
exports.respond = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['approve', 'deny'].includes(action)) {
    return res.status(400).json({ message: 'action must be approve or deny' });
  }

  const visitor = await Visitor.findOne({
    _id: req.params.id,
    society: req.user.society,
    flatNo: req.user.flatNo,
  });
  if (!visitor) return res.status(404).json({ message: 'Visitor not found for your flat' });
  if (visitor.status !== 'pending') return res.status(400).json({ message: `Already ${visitor.status}` });

  visitor.status = action === 'approve' ? 'approved' : 'denied';
  visitor.actionBy = req.user._id;
  await visitor.save();

  // push the decision to all guards in real time
  emitToGuards(req.user.society, 'visitor:response', visitor);
  if (visitor.createdBy) {
    await notifyUser(visitor.createdBy, {
      title: `Visitor ${visitor.status}`,
      message: `${visitor.name} for flat ${visitor.flatNo} was ${visitor.status} by ${req.user.name}`,
      type: 'visitor',
      data: { visitorId: visitor._id },
    });
  }
  res.json({ visitor });
});

/* ============ FEATURE 2: Pre-approved entry (resident generates passcode) ============ */

// POST /api/visitors/preapprove  (resident)
exports.preApprove = asyncHandler(async (req, res) => {
  const { name, phone, type = 'guest', company, vehicleNo, purpose, validFrom, validTo } = req.body;
  const from = validFrom ? new Date(validFrom) : new Date();
  const to = validTo ? new Date(validTo) : new Date(from.getTime() + 24 * 60 * 60 * 1000);
  if (to <= from) return res.status(400).json({ message: 'validTo must be after validFrom' });

  // make sure passcode is unique among active pre-approvals in this society
  let passcode;
  do {
    passcode = generatePasscode();
  } while (
    await Visitor.exists({ society: req.user.society, passcode, status: { $in: ['approved', 'entered'] } })
  );

  const visitor = await Visitor.create({
    society: req.user.society,
    flatNo: req.user.flatNo,
    name,
    phone,
    type,
    company,
    vehicleNo,
    purpose,
    status: 'approved',
    preApproved: true,
    passcode,
    validFrom: from,
    validTo: to,
    createdBy: req.user._id,
    actionBy: req.user._id,
  });

  res.status(201).json({
    visitor,
    shareText: `Hi ${name}, your entry code for flat ${req.user.flatNo} is ${passcode}. Show it at the gate.`,
  });
});

// POST /api/visitors/verify  (guard)  { passcode }
exports.verifyPasscode = asyncHandler(async (req, res) => {
  const { passcode } = req.body;
  const visitor = await Visitor.findOne({ society: req.user.society, passcode, status: 'approved' });
  if (!visitor) return res.status(404).json({ message: 'Invalid or already used passcode' });

  const now = new Date();
  if (visitor.validTo && now > visitor.validTo) {
    visitor.status = 'expired';
    await visitor.save();
    return res.status(400).json({ message: 'Passcode expired' });
  }
  if (visitor.validFrom && now < visitor.validFrom) {
    return res.status(400).json({ message: `Passcode valid from ${visitor.validFrom.toLocaleString()}` });
  }
  res.json({ visitor, message: 'Valid passcode. Allow entry.' });
});

/* ============ Entry / exit marking (guard) ============ */

// PATCH /api/visitors/:id/entry
exports.markEntry = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ _id: req.params.id, society: req.user.society });
  if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
  if (visitor.status !== 'approved') {
    return res.status(400).json({ message: `Cannot mark entry, status is ${visitor.status}` });
  }
  visitor.status = 'entered';
  visitor.entryTime = new Date();
  await visitor.save();
  await notifyFlat(User, req.user.society, visitor.flatNo, {
    title: 'Visitor entered',
    message: `${visitor.name} has entered the society.`,
    type: 'visitor',
    data: { visitorId: visitor._id },
  });
  res.json({ visitor });
});

// PATCH /api/visitors/:id/exit
exports.markExit = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ _id: req.params.id, society: req.user.society });
  if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
  if (visitor.status !== 'entered') return res.status(400).json({ message: 'Visitor has not entered yet' });
  visitor.status = 'exited';
  visitor.exitTime = new Date();
  await visitor.save();
  await notifyFlat(User, req.user.society, visitor.flatNo, {
    title: 'Visitor left',
    message: `${visitor.name} has left the society.`,
    type: 'visitor',
    data: { visitorId: visitor._id },
  });
  res.json({ visitor });
});

/* ============ Listing ============ */

// GET /api/visitors?status=&limit=   resident -> own flat only; guard/admin -> whole society
exports.list = asyncHandler(async (req, res) => {
  const { status, limit = 50 } = req.query;
  const filter = { society: req.user.society };
  if (req.user.role === 'resident') filter.flatNo = req.user.flatNo;
  if (status) filter.status = status;
  const visitors = await Visitor.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate('actionBy', 'name');
  res.json({ visitors });
});

// DELETE /api/visitors/:id  (resident cancels own pre-approval)
exports.cancel = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({
    _id: req.params.id,
    society: req.user.society,
    flatNo: req.user.flatNo,
    status: 'approved',
  });
  if (!visitor) return res.status(404).json({ message: 'Active pre-approval not found' });
  visitor.status = 'expired';
  await visitor.save();
  res.json({ visitor });
});
