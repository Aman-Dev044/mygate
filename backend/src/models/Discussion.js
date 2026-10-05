const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const discussionSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    replies: [replySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Discussion', discussionSchema);
