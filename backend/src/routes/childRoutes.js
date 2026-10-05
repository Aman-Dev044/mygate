const router = require('express').Router();
const c = require('../controllers/childController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', authorize('resident'), c.create);
router.put('/:id', authorize('resident'), c.update);
router.delete('/:id', authorize('resident'), c.remove);
router.post('/:id/log', authorize('guard', 'admin'), c.log);
router.get('/:id/logs', c.logs);

module.exports = router;
