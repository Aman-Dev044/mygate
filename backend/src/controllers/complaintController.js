const Complaint = require('../models/Complaint');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser } = require('../utils/notify');

/* ============ FEATURE 5: Complaints / helpdesk ============ */

const notifyAdmins = async (societyId, payload) => {
  const admins = await User.find({ society: societyId, role: 'admin' }).select('_id');
  await Promise.all(admins.map((a) => notifyUser(a._id, payload)));
};

// POST /api/complaints  (resident)  { category, title, description, priority }
exports.create = asyncHandler(async (req, res) => {
  const { category, title, description, priority } = req.body;
  const complaint = await Complaint.create({
    society: req.user.society,
    flatNo: req.user.flatNo,
    raisedBy: req.user._id,
    category,
    title,
    description,
    priority,
  });
  await notifyAdmins(req.user.society, {
    title: `New complaint from ${req.user.flatNo}`,
    message: `[${category}] ${title}`,
    type: 'complaint',
    data: { complaintId: complaint._id },
  });
  res.status(201).json({ complaint });
});

// GET /api/complaints?status=   resident -> own; admin -> all
exports.list = asyncHandler(async (req, res) => {
  const filter = { society: req.user.society };
  if (req.user.role === 'resident') filter.raisedBy = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  const complaints = await Complaint.find(filter)
    .populate('raisedBy', 'name flatNo')
    .populate('comments.by', 'name role')
    .sort({ createdAt: -1 });
  res.json({ complaints });
});

// GET /api/complaints/:id
exports.getOne = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, society: req.user.society })
    .populate('raisedBy', 'name flatNo phone')
    .populate('comments.by', 'name role');
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  if (req.user.role === 'resident' && String(complaint.raisedBy._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not your complaint' });
  }
  res.json({ complaint });
});

// PATCH /api/complaints/:id/status  (admin)  { status, assignedTo }
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, assignedTo } = req.body;
  const complaint = await Complaint.findOne({ _id: req.params.id, society: req.user.society });
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  if (status) complaint.status = status;
  if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
  if (status === 'resolved') complaint.resolvedAt = new Date();
  await complaint.save();

  await notifyUser(complaint.raisedBy, {
    title: `Complaint ${complaint.status.replace('_', ' ')}`,
    message: `${complaint.title}${assignedTo ? ` - assigned to ${assignedTo}` : ''}`,
    type: 'complaint',
    data: { complaintId: complaint._id },
  });
  res.json({ complaint });
});

// POST /api/complaints/:id/comments  { text }
exports.addComment = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, society: req.user.society });
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  if (req.user.role === 'resident' && String(complaint.raisedBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not your complaint' });
  }
  complaint.comments.push({ by: req.user._id, text: req.body.text });
  await complaint.save();

  // notify the other party
  if (req.user.role === 'resident') {
    await notifyAdmins(req.user.society, {
      title: `Comment on complaint ${complaint.title}`,
      message: req.body.text,
      type: 'complaint',
      data: { complaintId: complaint._id },
    });
  } else {
    await notifyUser(complaint.raisedBy, {
      title: `Update on: ${complaint.title}`,
      message: req.body.text,
      type: 'complaint',
      data: { complaintId: complaint._id },
    });
  }
  await complaint.populate('comments.by', 'name role');
  res.json({ complaint });
});

// POST /api/complaints/:id/rate  (resident)  { rating }
exports.rate = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, raisedBy: req.user._id });
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  if (complaint.status !== 'resolved') return res.status(400).json({ message: 'Only resolved complaints can be rated' });
  complaint.rating = req.body.rating;
  complaint.status = 'closed';
  await complaint.save();
  res.json({ complaint });
});
