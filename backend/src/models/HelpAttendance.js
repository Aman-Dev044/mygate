const mongoose = require('mongoose');

// One row per entry/exit cycle for a daily help worker
const helpAttendanceSchema = new mongoose.Schema(
  {
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    help: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyHelp', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    inTime: { type: Date, required: true },
    outTime: { type: Date },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

helpAttendanceSchema.index({ help: 1, date: 1 });

module.exports = mongoose.model('HelpAttendance', helpAttendanceSchema);
