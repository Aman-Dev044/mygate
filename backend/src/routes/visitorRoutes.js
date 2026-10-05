const router = require('express').Router();
const c = require('../controllers/visitorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/gate', authorize('guard', 'admin'), c.createAtGate);
router.post('/preapprove', authorize('resident'), c.preApprove);
router.post('/verify', authorize('guard', 'admin'), c.verifyPasscode);
router.patch('/:id/respond', authorize('resident'), c.respond);
router.patch('/:id/entry', authorize('guard', 'admin'), c.markEntry);
router.patch('/:id/exit', authorize('guard', 'admin'), c.markExit);
router.delete('/:id', authorize('resident'), c.cancel);

module.exports = router;
