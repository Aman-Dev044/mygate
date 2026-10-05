const Notice = require('../models/Notice');
const Poll = require('../models/Poll');
const Discussion = require('../models/Discussion');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser } = require('../utils/notify');

/* ============ FEATURE 7: Notices, polls, discussions ============ */

const notifyAllResidents = async (societyId, payload) => {
  const residents = await User.find({ society: societyId, role: 'resident', approved: true }).select('_id');
  await Promise.all(residents.map((r) => notifyUser(r._id, payload)));
};

/* ---- Notices ---- */

// POST /api/community/notices  (admin)
exports.createNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.create({ ...req.body, society: req.user.society, postedBy: req.user._id });
  await notifyAllResidents(req.user.society, {
    title: `Notice: ${notice.title}`,
    message: notice.body.slice(0, 140),
    type: 'notice',
    data: { noticeId: notice._id },
  });
  res.status(201).json({ notice });
});

// GET /api/community/notices
exports.listNotices = asyncHandler(async (req, res) => {
  const notices = await Notice.find({
    society: req.user.society,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .populate('postedBy', 'name')
    .sort({ pinned: -1, createdAt: -1 });
  res.json({ notices });
});

// DELETE /api/community/notices/:id  (admin)
exports.deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findOneAndDelete({ _id: req.params.id, society: req.user.society });
  if (!notice) return res.status(404).json({ message: 'Notice not found' });
  res.json({ message: 'Deleted' });
});

/* ---- Polls ---- */

// POST /api/community/polls  (admin)  { question, options: ['a','b'], closesAt }
exports.createPoll = asyncHandler(async (req, res) => {
  const { question, options = [], closesAt } = req.body;
  const poll = await Poll.create({
    society: req.user.society,
    question,
    options: options.map((text) => ({ text })),
    closesAt,
    createdBy: req.user._id,
  });
  await notifyAllResidents(req.user.society, {
    title: 'New poll',
    message: question,
    type: 'notice',
    data: { pollId: poll._id },
  });
  res.status(201).json({ poll });
});

const shapePoll = (poll, userId) => {
  const total = poll.options.reduce((s, o) => s + o.votes.length, 0);
  return {
    _id: poll._id,
    question: poll.question,
    closesAt: poll.closesAt,
    active: poll.active && (!poll.closesAt || poll.closesAt > new Date()),
    total,
    myVote: poll.options.findIndex((o) => o.votes.some((v) => String(v) === String(userId))),
    options: poll.options.map((o) => ({ _id: o._id, text: o.text, votes: o.votes.length })),
    createdAt: poll.createdAt,
  };
};

// GET /api/community/polls
exports.listPolls = asyncHandler(async (req, res) => {
  const polls = await Poll.find({ society: req.user.society }).sort({ createdAt: -1 });
  res.json({ polls: polls.map((p) => shapePoll(p, req.user._id)) });
});

// POST /api/community/polls/:id/vote  { optionIndex }
exports.vote = asyncHandler(async (req, res) => {
  const poll = await Poll.findOne({ _id: req.params.id, society: req.user.society });
  if (!poll) return res.status(404).json({ message: 'Poll not found' });
  if (!poll.active || (poll.closesAt && poll.closesAt < new Date())) {
    return res.status(400).json({ message: 'Poll closed' });
  }
  const idx = Number(req.body.optionIndex);
  if (Number.isNaN(idx) || !poll.options[idx]) return res.status(400).json({ message: 'Invalid option' });

  // one vote per user: remove any previous vote then add
  poll.options.forEach((o) => {
    o.votes = o.votes.filter((v) => String(v) !== String(req.user._id));
  });
  poll.options[idx].votes.push(req.user._id);
  await poll.save();
  res.json({ poll: shapePoll(poll, req.user._id) });
});

// PATCH /api/community/polls/:id/close  (admin)
exports.closePoll = asyncHandler(async (req, res) => {
  const poll = await Poll.findOneAndUpdate(
    { _id: req.params.id, society: req.user.society },
    { active: false },
    { new: true }
  );
  if (!poll) return res.status(404).json({ message: 'Poll not found' });
  res.json({ poll: shapePoll(poll, req.user._id) });
});

/* ---- Discussions ---- */

// POST /api/community/discussions  { title, body }
exports.createDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.create({ ...req.body, society: req.user.society, createdBy: req.user._id });
  await discussion.populate('createdBy', 'name flatNo');
  res.status(201).json({ discussion });
});

// GET /api/community/discussions
exports.listDiscussions = asyncHandler(async (req, res) => {
  const discussions = await Discussion.find({ society: req.user.society })
    .populate('createdBy', 'name flatNo')
    .populate('replies.by', 'name flatNo')
    .sort({ updatedAt: -1 });
  res.json({ discussions });
});

// POST /api/community/discussions/:id/replies  { text }
exports.reply = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findOne({ _id: req.params.id, society: req.user.society });
  if (!discussion) return res.status(404).json({ message: 'Discussion not found' });
  discussion.replies.push({ by: req.user._id, text: req.body.text });
  await discussion.save();
  await discussion.populate('createdBy', 'name flatNo');
  await discussion.populate('replies.by', 'name flatNo');
  res.json({ discussion });
});
