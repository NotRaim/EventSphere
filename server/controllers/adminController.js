const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Favorite = require('../models/Favorite');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');
const { deleteEventCascade } = require('./eventController');
const { startOfToday, addSeats } = require('../utils/helpers');

// GET /api/admin/stats
exports.stats = asyncHandler(async (req, res) => {
  const [totalUsers, totalOrganizers, pendingOrganizers, totalEvents, activeEvents, pendingEvents, totalRegistrations] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'organizer' }),
    User.countDocuments({ role: 'organizer', isApproved: false }),
    Event.countDocuments(),
    Event.countDocuments({ status: 'approved', date: { $gte: startOfToday() } }),
    Event.countDocuments({ status: 'pending' }),
    Registration.countDocuments({ status: 'confirmed' }),
  ]);
  res.json({ success: true, stats: { totalUsers, totalOrganizers, pendingOrganizers, totalEvents, activeEvents, pendingEvents, totalRegistrations } });
});

// GET /api/admin/users?role=user|organizer&search=
exports.users = asyncHandler(async (req, res) => {
  const filter = {};
  if (['user', 'organizer', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, users });
});

// DELETE /api/admin/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be deleted here');

  // Organizer: remove their events (and everything attached) first
  if (user.role === 'organizer') {
    const events = await Event.find({ organizerId: user._id });
    for (const ev of events) await deleteEventCascade(ev);
  }
  // Participant: free the seats they were holding
  const regs = await Registration.find({ userId: user._id, status: 'confirmed' });
  for (const r of regs) await Event.updateOne({ _id: r.eventId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });

  await Promise.all([
    Registration.deleteMany({ userId: user._id }), Favorite.deleteMany({ userId: user._id }),
    Feedback.deleteMany({ userId: user._id }), Notification.deleteMany({ userId: user._id }),
  ]);
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});

// PATCH /api/admin/users/:id/block   (toggles block / unblock)
exports.toggleBlock = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be blocked');
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, message: user.isActive ? 'User unblocked' : 'User blocked', user });
});

// PATCH /api/admin/users/:id/approve   (organizers)
exports.approveOrganizer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'organizer') throw new ApiError(404, 'Organizer not found');
  user.isApproved = req.body.approved !== false;
  await user.save();
  await notify(user._id, user.isApproved ? 'Organizer account approved' : 'Organizer approval removed',
    user.isApproved ? 'You can now create and publish events.' : 'You can no longer publish events.');
  res.json({ success: true, message: user.isApproved ? 'Organizer approved' : 'Approval removed', user });
});

// GET /api/admin/events?status=
exports.events = asyncHandler(async (req, res) => {
  const filter = ['pending', 'approved', 'rejected', 'cancelled'].includes(req.query.status) ? { status: req.query.status } : {};
  const events = await Event.find(filter).sort({ createdAt: -1 }).populate('organizerId', 'name email').lean();
  events.forEach(addSeats);
  res.json({ success: true, events });
});

// PATCH /api/admin/events/:id/status   body: { status: 'approved' | 'rejected' }
exports.setEventStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending', 'cancelled'].includes(status)) throw new ApiError(400, 'Invalid status');
  const event = await Event.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!event) throw new ApiError(404, 'Event not found');
  await notify(event.organizerId, `Event ${status}`, `Your event "${event.title}" was ${status} by the admin.`);
  res.json({ success: true, message: `Event ${status}`, event });
});

// DELETE /api/admin/events/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  await deleteEventCascade(event);
  res.json({ success: true, message: 'Event deleted' });
});

// GET /api/admin/registrations
exports.registrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find().sort({ registrationDate: -1 }).limit(500)
    .populate('userId', 'name email').populate('eventId', 'title date').lean();
  res.json({ success: true, registrations: registrations.filter((r) => r.userId && r.eventId) });
});

// GET /api/admin/settings  – read-only platform info shown in the Settings tab
exports.settings = asyncHandler(async (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    settings: {
      database: states[mongoose.connection.readyState] || 'unknown',
      databaseName: mongoose.connection.name,
      requireEventApproval: process.env.REQUIRE_EVENT_APPROVAL === 'true',
      imageStorage: process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY ? 'Cloudinary' : 'Local uploads folder',
      environment: process.env.NODE_ENV || 'development',
      contactMessages: await Message.countDocuments(),
    },
  });
});
