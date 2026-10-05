const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications?unread=1
exports.list = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unread) filter.read = false;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification: n });
});

// PATCH /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All marked read' });
});
