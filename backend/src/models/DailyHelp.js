const mongoose = require('mongoose');

// Maid / cook / driver / car cleaner etc. - one record, can be attached to many flats
const dailyHelpSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    type: {
      type: String,
      enum: ['maid', 'cook', 'driver', 'car_cleaner', 'nanny', 'tutor', 'other'],
      required: true,
    },
    passcode: { type: String, required: true },
    flats: [{ type: String }], // flat numbers served
    photoUrl: { type: String },
    active: { type: Boolean, default: true },
    isInside: { type: Boolean, default: false },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dailyHelpSchema.index({ society: 1, passcode: 1 }, { unique: true });

module.exports = mongoose.model('DailyHelp', dailyHelpSchema);
