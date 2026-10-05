const router = require('express').Router();
const c = require('../controllers/communityController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
// notices
router.get('/notices', c.listNotices);
router.post('/notices', authorize('admin'), c.createNotice);
router.delete('/notices/:id', authorize('admin'), c.deleteNotice);
// polls
router.get('/polls', c.listPolls);
router.post('/polls', authorize('admin'), c.createPoll);
router.post('/polls/:id/vote', authorize('resident'), c.vote);
router.patch('/polls/:id/close', authorize('admin'), c.closePoll);
// discussions
router.get('/discussions', c.listDiscussions);
router.post('/discussions', authorize('resident', 'admin'), c.createDiscussion);
router.post('/discussions/:id/replies', authorize('resident', 'admin'), c.reply);

module.exports = router;
