const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String, enum: ['general', 'maintenance', 'event', 'emergency', 'meeting'], default: 'general' },
    pinned: { type: Boolean, default: false },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);
