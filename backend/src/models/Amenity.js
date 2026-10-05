const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true }, // Clubhouse, Gym, Swimming Pool, Community Hall
    description: { type: String },
    openTime: { type: String, default: '06:00' }, // HH:mm
    closeTime: { type: String, default: '22:00' },
    slotMinutes: { type: Number, default: 60 },
    capacity: { type: Number, default: 1 }, // bookings allowed per slot
    chargePerSlot: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Amenity', amenitySchema);
