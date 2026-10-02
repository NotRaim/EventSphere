const Feedback = require('../models/Feedback');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/events/:id/feedback  – only people registered for the event can review it
exports.create = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  const reg = await Registration.findOne({ userId: req.user._id, eventId: event._id, status: 'confirmed' });
  if (!reg) throw new ApiError(403, 'Only registered participants can leave feedback');

  const fb = await Feedback.findOneAndUpdate(
    { userId: req.user._id, eventId: event._id },
    { rating: Number(req.body.rating), comment: req.body.comment || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ success: true, message: 'Thanks for your feedback!', feedback: fb });
});

// GET /api/events/:id/feedback
exports.list = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({ eventId: req.params.id }).sort({ createdAt: -1 }).limit(50).populate('userId', 'name').lean();
  const average = feedback.length ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : 0;
  res.json({ success: true, average: Math.round(average * 10) / 10, count: feedback.length, feedback });
});
