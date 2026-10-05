const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'resident', 'guard'], default: 'resident' },
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    flatNo: { type: String }, // e.g. A-101 (residents only)
    tower: { type: String },
    isOwner: { type: Boolean, default: true },
    approved: { type: Boolean, default: true }, // admin can block a resident
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
