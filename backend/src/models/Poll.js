const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const pollSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    question: { type: String, required: true },
    options: { type: [optionSchema], validate: (v) => v.length >= 2 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closesAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Poll', pollSchema);
