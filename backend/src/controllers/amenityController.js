const Amenity = require('../models/Amenity');
const AmenityBooking = require('../models/AmenityBooking');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser } = require('../utils/notify');

/* ============ FEATURE 6: Amenity booking (clubhouse, gym, pool, hall) ============ */

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// POST /api/amenities  (admin)
exports.create = asyncHandler(async (req, res) => {
  const amenity = await Amenity.create({ ...req.body, society: req.user.society });
  res.status(201).json({ amenity });
});

// GET /api/amenities
exports.list = asyncHandler(async (req, res) => {
  const amenities = await Amenity.find({ society: req.user.society, active: true }).sort({ name: 1 });
  res.json({ amenities });
});

// PUT /api/amenities/:id  (admin)
exports.update = asyncHandler(async (req, res) => {
  const amenity = await Amenity.findOneAndUpdate(
    { _id: req.params.id, society: req.user.society },
    req.body,
    { new: true, runValidators: true }
  );
  if (!amenity) return res.status(404).json({ message: 'Amenity not found' });
  res.json({ amenity });
});

// GET /api/amenities/:id/slots?date=YYYY-MM-DD  -> slots with availability
exports.slots = asyncHandler(async (req, res) => {
  const amenity = await Amenity.findOne({ _id: req.params.id, society: req.user.society });
  if (!amenity) return res.status(404).json({ message: 'Amenity not found' });
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const bookings = await AmenityBooking.find({ amenity: amenity._id, date, status: 'confirmed' });
  const slots = [];
  for (let t = toMin(amenity.openTime); t + amenity.slotMinutes <= toMin(amenity.closeTime); t += amenity.slotMinutes) {
    const startTime = toHHMM(t);
    const booked = bookings.filter((b) => b.startTime === startTime).length;
    slots.push({
      startTime,
      endTime: toHHMM(t + amenity.slotMinutes),
      booked,
      available: amenity.capacity - booked,
      bookedByMe: bookings.some((b) => b.startTime === startTime && String(b.bookedBy) === String(req.user._id)),
    });
  }
  res.json({ amenity, date, slots });
});

// POST /api/amenities/:id/book  (resident)  { date, startTime, guests }
exports.book = asyncHandler(async (req, res) => {
  const amenity = await Amenity.findOne({ _id: req.params.id, society: req.user.society, active: true });
  if (!amenity) return res.status(404).json({ message: 'Amenity not found' });
  const { date, startTime, guests = 1 } = req.body;
  if (!date || !startTime) return res.status(400).json({ message: 'date and startTime required' });

  const start = toMin(startTime);
  if (start < toMin(amenity.openTime) || start + amenity.slotMinutes > toMin(amenity.closeTime)) {
    return res.status(400).json({ message: 'Slot outside opening hours' });
  }
  if (new Date(`${date}T${startTime}`) < new Date()) {
    return res.status(400).json({ message: 'Cannot book a past slot' });
  }

  const existing = await AmenityBooking.countDocuments({ amenity: amenity._id, date, startTime, status: 'confirmed' });
  if (existing >= amenity.capacity) return res.status(409).json({ message: 'Slot already full' });

  const dup = await AmenityBooking.exists({ amenity: amenity._id, date, startTime, bookedBy: req.user._id, status: 'confirmed' });
  if (dup) return res.status(409).json({ message: 'You already booked this slot' });

  const booking = await AmenityBooking.create({
    society: req.user.society,
    amenity: amenity._id,
    flatNo: req.user.flatNo,
    bookedBy: req.user._id,
    date,
    startTime,
    endTime: toHHMM(start + amenity.slotMinutes),
    guests,
    amount: amenity.chargePerSlot,
  });
  await notifyUser(req.user._id, {
    title: 'Booking confirmed',
    message: `${amenity.name} on ${date} at ${startTime}`,
    type: 'amenity',
    data: { bookingId: booking._id },
  });
  res.status(201).json({ booking });
});

// GET /api/amenities/bookings/mine   (resident) ; admin gets all
exports.myBookings = asyncHandler(async (req, res) => {
  const filter = { society: req.user.society };
  if (req.user.role !== 'admin') filter.bookedBy = req.user._id;
  const bookings = await AmenityBooking.find(filter)
    .populate('amenity', 'name')
    .populate('bookedBy', 'name flatNo')
    .sort({ date: -1, startTime: -1 });
  res.json({ bookings });
});

// DELETE /api/amenities/bookings/:bookingId  (cancel)
exports.cancel = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.bookingId, society: req.user.society, status: 'confirmed' };
  if (req.user.role !== 'admin') filter.bookedBy = req.user._id;
  const booking = await AmenityBooking.findOne(filter);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  booking.status = 'cancelled';
  await booking.save();
  res.json({ booking });
});
