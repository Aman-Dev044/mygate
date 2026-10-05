const router = require('express').Router();
const c = require('../controllers/dailyHelpController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', authorize('resident', 'admin'), c.create);
router.post('/checkin', authorize('guard', 'admin'), c.checkIn);
router.post('/checkout', authorize('guard', 'admin'), c.checkOut);
router.get('/:id/attendance', c.attendance);
router.delete('/:id', authorize('resident', 'admin'), c.unlink);

module.exports = router;
