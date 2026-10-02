const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/favoriteController');

router.use(protect);
router.get('/', ctrl.list);
router.post('/:eventId', ctrl.add);
router.delete('/:eventId', ctrl.remove);

module.exports = router;
