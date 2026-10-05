const router = require('express').Router();
const c = require('../controllers/amenityController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', authorize('admin'), c.create);
router.get('/bookings/mine', c.myBookings);
router.delete('/bookings/:bookingId', c.cancel);
router.put('/:id', authorize('admin'), c.update);
router.get('/:id/slots', c.slots);
router.post('/:id/book', authorize('resident'), c.book);

module.exports = router;
