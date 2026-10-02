const Favorite = require('../models/Favorite');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { addSeats } = require('../utils/helpers');

// POST /api/favorites/:eventId
exports.add = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event || event.status !== 'approved') throw new ApiError(404, 'Event not found');
  await Favorite.updateOne({ userId: req.user._id, eventId: event._id }, { $setOnInsert: { userId: req.user._id, eventId: event._id } }, { upsert: true });
  res.status(201).json({ success: true, message: 'Added to favorites' });
});

// GET /api/favorites
exports.list = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ userId: req.user._id }).sort({ createdAt: -1 })
    .populate({ path: 'eventId', populate: { path: 'organizerId', select: 'name' } }).lean();
  const events = favs.filter((f) => f.eventId).map((f) => addSeats({ ...f.eventId, isFavorite: true }));
  res.json({ success: true, events });
});

// DELETE /api/favorites/:eventId
exports.remove = asyncHandler(async (req, res) => {
  await Favorite.deleteOne({ userId: req.user._id, eventId: req.params.eventId });
  res.json({ success: true, message: 'Removed from favorites' });
});
