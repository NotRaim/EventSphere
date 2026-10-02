const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');

exports.send = asyncHandler(async (req, res) => {
  const message = await Message.create({
    userId: req.user?._id || null,
    name: req.body.name,
    email: req.body.email,
    subject: req.body.subject || 'General help',
    message: req.body.message,
  });
  res.status(201).json({ success: true, id: message._id.toString(), message: 'Thanks! Your message has been received.' });
});
