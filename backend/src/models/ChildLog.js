const mongoose = require('mongoose');

const childLogSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    action: { type: String, enum: ['exit', 'entry'], required: true },
    escort: { type: String, required: true }, // who the child is with
    note: { type: String },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // guard
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChildLog', childLogSchema);
