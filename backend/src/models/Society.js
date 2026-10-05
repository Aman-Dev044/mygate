const mongoose = require('mongoose');

const societySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true }, // residents join using this code
    towers: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Society', societySchema);
