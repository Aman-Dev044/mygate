const router = require('express').Router();
const c = require('../controllers/billController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.get('/summary', authorize('admin'), c.summary);
router.post('/', authorize('admin'), c.create);
router.get('/:id', c.getOne);
router.post('/:id/pay', authorize('resident'), c.pay);
router.post('/:id/mark-paid', authorize('admin'), c.markPaid);

module.exports = router;
