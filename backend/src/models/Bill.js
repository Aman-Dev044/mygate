const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    flatNo: { type: String, required: true },
    invoiceNo: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['maintenance', 'water', 'electricity', 'parking', 'penalty', 'other'],
      default: 'maintenance',
    },
    description: { type: String },
    amount: { type: Number, required: true, min: 0 },
    period: { type: String }, // e.g. Oct 2026
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['unpaid', 'paid', 'overdue'], default: 'unpaid' },
    paidAt: { type: Date },
    paymentRef: { type: String },
    paymentMethod: { type: String, enum: ['upi', 'card', 'netbanking', 'cash', 'cheque'] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

billSchema.index({ society: 1, flatNo: 1, status: 1 });

module.exports = mongoose.model('Bill', billSchema);
