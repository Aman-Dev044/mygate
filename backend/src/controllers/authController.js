const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Society = require('../models/Society');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, society: user.society }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  society: u.society,
  flatNo: u.flatNo,
  tower: u.tower,
  isOwner: u.isOwner,
});

// POST /api/auth/register  { name,email,phone,password,societyCode,flatNo,tower,role? }
exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, societyCode, flatNo, tower, role } = req.body;
  if (!societyCode) return res.status(400).json({ message: 'societyCode required' });

  const society = await Society.findOne({ code: societyCode.toUpperCase() });
  if (!society) return res.status(404).json({ message: 'Society code not found' });

  const allowedRole = ['resident', 'guard'].includes(role) ? role : 'resident';
  if (allowedRole === 'resident' && !flatNo) {
    return res.status(400).json({ message: 'flatNo required for residents' });
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    flatNo,
    tower,
    role: allowedRole,
    society: society._id,
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login  { email, password }
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.approved) return res.status(403).json({ message: 'Account blocked by admin' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('society', 'name code city');
  res.json({ user });
});

// PUT /api/auth/me  { name, phone }
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  );
  res.json({ user: publicUser(user) });
});
