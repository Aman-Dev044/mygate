const router = require('express').Router();
const c = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', authorize('resident'), c.create);
router.get('/:id', c.getOne);
router.patch('/:id/status', authorize('admin'), c.updateStatus);
router.post('/:id/comments', c.addComment);
router.post('/:id/rate', authorize('resident'), c.rate);

module.exports = router;
