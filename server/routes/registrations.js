const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/registrationController');

router.get('/my', protect, ctrl.my);
router.delete('/:id', protect, ctrl.cancel);
router.patch('/:id/attendance', protect, authorize('organizer', 'admin'), ctrl.setAttendance);

module.exports = router;
