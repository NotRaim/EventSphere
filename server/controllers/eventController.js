const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Favorite = require('../models/Favorite');
const Feedback = require('../models/Feedback');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notifyMany } = require('../utils/notify');
const { escapeRegex, startOfToday, addSeats } = require('../utils/helpers');

// Multipart forms send arrays as JSON strings – parse them safely
const parseList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try { const v = JSON.parse(value); return Array.isArray(v) ? v : []; } catch { return []; }
};

const cleanEventBody = (body) => {
  const data = {
    title: body.title, description: body.description, category: body.category,
    date: body.date, time: body.time, location: body.location,
    capacity: Number(body.capacity), registrationDeadline: body.registrationDeadline,
    speakers: parseList(body.speakers).filter((s) => s && s.name).map((s) => ({ name: String(s.name), role: String(s.role || '') })),
    schedule: parseList(body.schedule).filter((s) => s && s.title).map((s) => ({ time: String(s.time || ''), title: String(s.title) })),
    rules: parseList(body.rules).map(String).filter(Boolean),
    contact: { email: body.contactEmail || '', phone: body.contactPhone || '' },
  };
  if (body.image) data.image = body.image;
  return data;
};

const canManage = (user, event) => user.role === 'admin' || String(event.organizerId._id || event.organizerId) === String(user._id);

// GET /api/events  (public) – search, filters, sorting, pagination
exports.list = asyncHandler(async (req, res) => {
  const { search, category, location, date, sort = 'date', when = 'upcoming' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));

  const filter = { status: 'approved' };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }
  if (category) filter.category = String(category);
  if (location) filter.location = new RegExp(escapeRegex(location), 'i');

  if (date) {                      // "events on or after this date"
    const d = new Date(String(date));
    if (!isNaN(d)) filter.date = { $gte: d };
  } else if (when === 'upcoming') {
    filter.date = { $gte: startOfToday() };
  } else if (when === 'past') {
    filter.date = { $lt: startOfToday() };
  }

  const sortMap = {
    date: { date: 1 }, '-date': { date: -1 }, newest: { createdAt: -1 },
    popular: { registeredCount: -1 }, seats: { capacity: -1 },
  };

  const [total, events] = await Promise.all([
    Event.countDocuments(filter),
    Event.find(filter).sort(sortMap[sort] || sortMap.date).skip((page - 1) * limit).limit(limit)
      .populate('organizerId', 'name').lean(),
  ]);

  events.forEach(addSeats);

  // Add per-user flags when logged in (registered / favourite)
  if (req.user && events.length) {
    const ids = events.map((e) => e._id);
    const [regs, favs] = await Promise.all([
      Registration.find({ userId: req.user._id, eventId: { $in: ids }, status: 'confirmed' }).select('eventId'),
      Favorite.find({ userId: req.user._id, eventId: { $in: ids } }).select('eventId'),
    ]);
    const regSet = new Set(regs.map((r) => String(r.eventId)));
    const favSet = new Set(favs.map((f) => String(f.eventId)));
    events.forEach((e) => { e.isRegistered = regSet.has(String(e._id)); e.isFavorite = favSet.has(String(e._id)); });
  }

  res.json({ success: true, total, page, pages: Math.ceil(total / limit) || 1, events });
});

// GET /api/events/mine  (organizer/admin) – events I created
exports.mine = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { organizerId: req.user._id };
  const events = await Event.find(filter).sort({ date: -1 }).populate('organizerId', 'name').lean();
  events.forEach(addSeats);
  res.json({ success: true, events });
});

// GET /api/events/:id
exports.getOne = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizerId', 'name email phone').lean();
  if (!event) throw new ApiError(404, 'Event not found');
  addSeats(event);

  if (event.status !== 'approved' && !(req.user && canManage(req.user, event))) throw new ApiError(404, 'Event not found');

  const [ratingAgg] = await Feedback.aggregate([
    { $match: { eventId: event._id } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  event.rating = ratingAgg ? { average: Math.round(ratingAgg.avg * 10) / 10, count: ratingAgg.count } : { average: 0, count: 0 };

  if (req.user) {
    const [reg, fav] = await Promise.all([
      Registration.findOne({ userId: req.user._id, eventId: event._id, status: 'confirmed' }),
      Favorite.exists({ userId: req.user._id, eventId: event._id }),
    ]);
    event.isRegistered = !!reg;
    event.registrationId = reg ? reg.registrationId : null;
    event.myRegistrationDbId = reg ? reg._id : null;
    event.isFavorite = !!fav;
    event.canManage = canManage(req.user, event);
  }
  res.json({ success: true, event });
});

// POST /api/events  (organizer/admin)
exports.create = asyncHandler(async (req, res) => {
  if (req.user.role === 'organizer' && !req.user.isApproved) {
    throw new ApiError(403, 'Your organizer account is waiting for admin approval');
  }
  const data = cleanEventBody(req.body);
  if (new Date(data.registrationDeadline) > new Date(data.date)) {
    throw new ApiError(400, 'Registration deadline must be on or before the event date');
  }
  data.organizerId = req.user._id;
  data.status = req.user.role === 'admin' || process.env.REQUIRE_EVENT_APPROVAL !== 'true' ? 'approved' : 'pending';
  if (!data.contact.email) data.contact.email = req.user.email;

  const event = await Event.create(data);
  res.status(201).json({
    success: true,
    message: event.status === 'pending' ? 'Event submitted. It will appear once an admin approves it.' : 'Event created successfully',
    event,
  });
});

// PUT /api/events/:id
exports.update = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (!canManage(req.user, event)) throw new ApiError(403, 'You can only edit your own events');

  const data = cleanEventBody(req.body);
  if (data.capacity < event.registeredCount) {
    throw new ApiError(400, `Capacity cannot be lower than the ${event.registeredCount} seats already booked`);
  }
  if (new Date(data.registrationDeadline) > new Date(data.date)) {
    throw new ApiError(400, 'Registration deadline must be on or before the event date');
  }

  const locationChanged = data.location !== event.location;
  const timeChanged = data.time !== event.time || new Date(data.date).getTime() !== event.date.getTime();

  event.set(data);
  await event.save();

  // Tell everyone who registered about important changes
  if (locationChanged || timeChanged) {
    const regs = await Registration.find({ eventId: event._id, status: 'confirmed' }).select('userId');
    await notifyMany(
      regs.map((r) => r.userId),
      locationChanged ? 'Event location has been updated' : 'Event schedule has been updated',
      `"${event.title}" – new details: ${event.location}, ${event.time}.`
    );
  }
  res.json({ success: true, message: 'Event updated', event });
});

// Shared by organizer delete and admin delete
exports.deleteEventCascade = async (event) => {
  const regs = await Registration.find({ eventId: event._id, status: 'confirmed' }).select('userId');
  await notifyMany(regs.map((r) => r.userId), 'Event cancelled', `"${event.title}" has been cancelled by the organizer.`);
  await Promise.all([
    Registration.deleteMany({ eventId: event._id }),
    Favorite.deleteMany({ eventId: event._id }),
    Feedback.deleteMany({ eventId: event._id }),
  ]);
  await event.deleteOne();
};

// DELETE /api/events/:id
exports.remove = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (!canManage(req.user, event)) throw new ApiError(403, 'You can only delete your own events');
  await exports.deleteEventCascade(event);
  res.json({ success: true, message: 'Event deleted' });
});
