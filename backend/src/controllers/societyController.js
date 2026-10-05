const Society = require('../models/Society');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/societies  (public bootstrap: creates society + its first admin)
exports.createSociety = asyncHandler(async (req, res) => {
  const { society, admin } = req.body;
  if (!society || !admin) {
    return res.status(400).json({ message: 'society and admin objects required' });
  }
  const created = await Society.create(society);
  const adminUser = await User.create({ ...admin, role: 'admin', society: created._id });
  res.status(201).json({ society: created, admin: { _id: adminUser._id, email: adminUser.email } });
});

// GET /api/societies/mine
exports.mySociety = asyncHandler(async (req, res) => {
  const society = await Society.findById(req.user.society);
  res.json({ society });
});

// GET /api/societies/residents  -> resident directory (Feature 7)
exports.residents = asyncHandler(async (req, res) => {
  const residents = await User.find({ society: req.user.society, role: 'resident', approved: true })
    .select('name phone flatNo tower isOwner')
    .sort({ flatNo: 1 });
  res.json({ residents });
});

// GET /api/societies/users  (admin) -> all users incl. guards
exports.allUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ society: req.user.society })
    .select('-password')
    .sort({ role: 1, flatNo: 1 });
  res.json({ users });
});

// PATCH /api/societies/users/:id/approve  { approved: true|false }
exports.toggleUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, society: req.user.society },
    { approved: !!req.body.approved },
    { new: true }
  ).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

// GET /api/societies/stats  (admin dashboard)
exports.stats = asyncHandler(async (req, res) => {
  const Visitor = require('../models/Visitor');
  const Complaint = require('../models/Complaint');
  const Bill = require('../models/Bill');
  const s = req.user.society;
  const [residents, guards, pendingVisitors, insideVisitors, openComplaints, unpaid] = await Promise.all([
    User.countDocuments({ society: s, role: 'resident' }),
    User.countDocuments({ society: s, role: 'guard' }),
    Visitor.countDocuments({ society: s, status: 'pending' }),
    Visitor.countDocuments({ society: s, status: 'entered' }),
    Complaint.countDocuments({ society: s, status: { $in: ['open', 'in_progress'] } }),
    Bill.aggregate([
      { $match: { society: s, status: { $ne: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  res.json({
    residents,
    guards,
    pendingVisitors,
    insideVisitors,
    openComplaints,
    unpaidBills: unpaid[0]?.count || 0,
    unpaidAmount: unpaid[0]?.total || 0,
  });
});
