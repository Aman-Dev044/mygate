const mongoose = require('mongoose');

const amenityBookingSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    amenity: { type: mongoose.Schema.Types.ObjectId, ref: 'Amenity', required: true },
    flatNo: { type: String, required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    guests: { type: Number, default: 1 },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

amenityBookingSchema.index({ amenity: 1, date: 1, startTime: 1 });

module.exports = mongoose.model('AmenityBooking', amenityBookingSchema);
