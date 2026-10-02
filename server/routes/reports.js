const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.use(protect, authorize('organizer', 'admin'));
router.get('/summary', ctrl.summary);
router.get('/export', ctrl.exportCsv);

module.exports = router;
