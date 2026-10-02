const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.use(protect);
router.get('/', ctrl.list);
router.patch('/read-all', ctrl.readAll); // before /:id/read
router.patch('/:id/read', ctrl.read);

module.exports = router;
