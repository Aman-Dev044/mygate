const router = require('express').Router();
const c = require('../controllers/societyController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', c.createSociety); // bootstrap
router.get('/mine', protect, c.mySociety);
router.get('/residents', protect, c.residents);
router.get('/users', protect, authorize('admin'), c.allUsers);
router.patch('/users/:id/approve', protect, authorize('admin'), c.toggleUser);
router.get('/stats', protect, authorize('admin', 'guard'), c.stats);

module.exports = router;
