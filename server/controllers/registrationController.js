const Event = require('../models/Event');
const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');
const { generateRegistrationId, eventStart } = require('../utils/helpers');
const { toDataUrl } = require('../utils/qr');

const ownsEvent = (user, event) => user.role === 'admin' || String(event.organizerId) === String(user._id);

// POST /api/events/:id/register
exports.register = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event || event.status !== 'approved') throw new ApiError(404, 'Event not found');
  if (String(event.organizerId) === String(req.user._id)) throw new ApiError(400, 'You cannot register for your own event');
  if (eventStart(event) < new Date()) throw new ApiError(400, 'This event has already taken place');
  if (new Date(event.registrationDeadline).getTime() + 86399999 < Date.now()) throw new ApiError(400, 'The registration deadline has passed');

  const existing = await Registration.findOne({ userId: req.user._id, eventId: event._id });
  if (existing && existing.status === 'confirmed') throw new ApiError(409, 'Already registered');

  // Atomically take a seat: only succeeds while seats are left, so two people can never take the last seat
  const claimed = await Event.findOneAndUpdate(
    { _id: event._id, $expr: { $lt: ['$registeredCount', '$capacity'] } },
    { $inc: { registeredCount: 1 } },
    { new: true }
  );
  if (!claimed) throw new ApiError(409, 'Registration full');

  let reg;
  try {
    if (existing) { // re-registering after a cancellation
      existing.status = 'confirmed';
      existing.attendance = false;
      existing.registrationDate = new Date();
      reg = await existing.save();
    } else {
      reg = await Registration.create({ userId: req.user._id, eventId: event._id, registrationId: generateRegistrationId() });
    }
  } catch (err) {
    await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: -1 } }); // give the seat back
    if (err.code === 11000) throw new ApiError(409, 'Already registered');
    throw err;
  }

  await notify(req.user._id, 'Registration successful', `You are registered for "${event.title}". Your ID is ${reg.registrationId}.`);
  res.status(201).json({
    success: true,
    message: 'Registration successful!',
    registration: { _id: reg._id, registrationId: reg.registrationId, status: reg.status },
    qrCode: await toDataUrl(reg),
    availableSeats: claimed.capacity - claimed.registeredCount,
  });
});

// GET /api/registrations/my
exports.my = asyncHandler(async (req, res) => {
  const regs = await Registration.find({ userId: req.user._id })
    .sort({ registrationDate: -1 })
    .populate('eventId', 'title date time location category image status organizerId')
    .lean();

  const valid = regs.filter((r) => r.eventId); // skip registrations whose event was removed
  const withQr = await Promise.all(valid.map(async (r) => ({
    ...r,
    event: r.eventId,
    qrCode: r.status === 'confirmed' ? await toDataUrl(r) : null,
  })));
  withQr.forEach((r) => { r.eventId = r.event._id; });
  res.json({ success: true, registrations: withQr });
});

// GET /api/events/:id/registrations  (organizer of the event / admin)
exports.forEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (!ownsEvent(req.user, event)) throw new ApiError(403, 'You can only view registrations of your own events');

  const registrations = await Registration.find({ eventId: event._id })
    .sort({ registrationDate: -1 }).populate('userId', 'name email phone').lean();
  res.json({ success: true, event: { _id: event._id, title: event.title, capacity: event.capacity, registeredCount: event.registeredCount }, registrations });
});

// DELETE /api/registrations/:id  – cancel (participant, event organizer or admin)
exports.cancel = asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg) throw new ApiError(404, 'Registration not found');
  const event = await Event.findById(reg.eventId);

  const isOwner = String(reg.userId) === String(req.user._id);
  if (!isOwner && !(event && ownsEvent(req.user, event))) throw new ApiError(403, 'Unauthorized');
  if (reg.status === 'cancelled') throw new ApiError(400, 'This registration is already cancelled');
  if (reg.attendance) throw new ApiError(400, 'Cannot cancel after check-in');

  reg.status = 'cancelled';
  await reg.save();
  if (event) await Event.updateOne({ _id: event._id, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });
  if (!isOwner && event) await notify(reg.userId, 'Registration cancelled', `Your registration for "${event.title}" was cancelled by the organizer.`);

  res.json({ success: true, message: 'Registration cancelled' });
});

// PATCH /api/registrations/:id/attendance   body: { attendance: true|false }
exports.setAttendance = asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg || reg.status !== 'confirmed') throw new ApiError(404, 'Registration not found');
  const event = await Event.findById(reg.eventId);
  if (!event || !ownsEvent(req.user, event)) throw new ApiError(403, 'Unauthorized');

  reg.attendance = !!req.body.attendance;
  reg.attendedAt = reg.attendance ? new Date() : undefined;
  await reg.save();
  res.json({ success: true, message: reg.attendance ? 'Marked present' : 'Marked absent', registration: reg });
});

// POST /api/events/:id/checkin   body: { code }  – code = registration ID or the QR text
exports.checkIn = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (!ownsEvent(req.user, event)) throw new ApiError(403, 'Unauthorized');

  let code = String(req.body.code || '').trim();
  try { const parsed = JSON.parse(code); if (parsed && parsed.r) { // QR payload
    if (parsed.e && String(parsed.e) !== String(event._id)) throw new ApiError(400, 'This ticket is for a different event');
    code = parsed.r; } } catch (e) { if (e instanceof ApiError) throw e; }

  const reg = await Registration.findOne({ eventId: event._id, registrationId: code.toUpperCase(), status: 'confirmed' }).populate('userId', 'name email');
  if (!reg) throw new ApiError(404, 'Invalid ticket: no confirmed registration found for this event');
  if (reg.attendance) throw new ApiError(409, `${reg.userId.name} is already checked in`);

  reg.attendance = true;
  reg.attendedAt = new Date();
  await reg.save();
  res.json({ success: true, message: `${reg.userId.name} checked in`, participant: { name: reg.userId.name, email: reg.userId.email, registrationId: reg.registrationId } });
});
