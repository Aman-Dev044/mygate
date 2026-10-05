const mongoose = require('mongoose');

/**
 * Visitor = guest / delivery / cab.
 * Two flows:
 *  1. Guard creates at gate  -> status pending -> resident approves/denies
 *  2. Resident pre-approves  -> status approved + passcode -> guard verifies code
 */
const visitorSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    flatNo: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    type: { type: String, enum: ['guest', 'delivery', 'cab', 'service', 'other'], default: 'guest' },
    company: { type: String }, // Swiggy / Amazon / Uber etc.
    vehicleNo: { type: String },
    purpose: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied', 'entered', 'exited', 'expired'],
      default: 'pending',
    },
    preApproved: { type: Boolean, default: false },
    passcode: { type: String },
    validFrom: { type: Date },
    validTo: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // guard or resident
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // resident who approved/denied
    entryTime: { type: Date },
    exitTime: { type: Date },
  },
  { timestamps: true }
);

visitorSchema.index({ society: 1, status: 1, createdAt: -1 });
visitorSchema.index({ society: 1, passcode: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
