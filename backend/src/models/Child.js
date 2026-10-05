const mongoose = require('mongoose');

// Kid safety: children registered by parents; guard logs exit/entry and parents get notified
const childSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    flatNo: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true, min: 0, max: 18 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    allowedEscorts: [{ type: String }], // e.g. School bus, Grandfather
    isInside: { type: Boolean, default: true },
    photoUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Child', childSchema);
