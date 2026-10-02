const router = require('express').Router();
const { optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/contactController');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  const subject = String(req.body?.subject || 'General help').trim();
  const message = String(req.body?.message || '').trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (name.length < 2 || name.length > 80) return res.status(400).json({ success:false, message:'Please enter your name' });
  if (!emailOk) return res.status(400).json({ success:false, message:'Invalid email' });
  if (subject.length < 2 || subject.length > 120) return res.status(400).json({ success:false, message:'Invalid subject' });
  if (message.length < 5 || message.length > 2000) return res.status(400).json({ success:false, message:'Please write a message' });

  req.body = { name, email, subject, message };
  return ctrl.send(req, res);
}));

module.exports = router;
