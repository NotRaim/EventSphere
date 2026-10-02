const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications
exports.list = asyncHandler(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(40),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  res.json({ success: true, unread, notifications });
});

// PATCH /api/notifications/read-all
exports.readAll = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

// PATCH /api/notifications/:id/read
exports.read = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { isRead: true });
  res.json({ success: true });
});
