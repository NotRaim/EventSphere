const Event = require('../models/Event');
const Registration = require('../models/Registration');
const asyncHandler = require('../utils/asyncHandler');
const { eventStart } = require('../utils/helpers');

// Builds the numbers used by organizer + admin reports.
// Admin sees the whole platform, organizers see only their own events.
async function buildSummary(user) {
  const filter = user.role === 'admin' ? {} : { organizerId: user._id };
  const events = await Event.find(filter).lean();
  const ids = events.map((e) => e._id);

  const perEventAgg = await Registration.aggregate([
    { $match: { eventId: { $in: ids }, status: 'confirmed' } },
    { $group: { _id: '$eventId', registrations: { $sum: 1 }, attended: { $sum: { $cond: ['$attendance', 1, 0] } } } },
  ]);
  const aggMap = new Map(perEventAgg.map((a) => [String(a._id), a]));
  const now = new Date();

  const perEvent = events.map((e) => {
    const a = aggMap.get(String(e._id)) || { registrations: 0, attended: 0 };
    return {
      id: e._id, title: e.title, category: e.category, date: e.date, status: e.status, capacity: e.capacity,
      registrations: a.registrations, attended: a.attended, isPast: eventStart(e) < now,
    };
  });

  const totalRegistrations = perEvent.reduce((s, e) => s + e.registrations, 0);
  const past = perEvent.filter((e) => e.isPast);
  const pastRegs = past.reduce((s, e) => s + e.registrations, 0);
  const pastAttended = past.reduce((s, e) => s + e.attended, 0);

  const byCategoryMap = {};
  events.forEach((e) => { byCategoryMap[e.category] = (byCategoryMap[e.category] || 0) + 1; });

  // last 6 months of registrations
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' }), count: 0 });
  }
  const monthly = await Registration.aggregate([
    { $match: { eventId: { $in: ids }, status: 'confirmed', registrationDate: { $gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$registrationDate' } }, count: { $sum: 1 } } },
  ]);
  monthly.forEach((m) => { const slot = months.find((x) => x.key === m._id); if (slot) slot.count = m.count; });

  const mostPopular = perEvent.slice().sort((a, b) => b.registrations - a.registrations)[0];

  return {
    totalEvents: events.length,
    upcomingEvents: perEvent.filter((e) => !e.isPast && e.status === 'approved').length,
    totalRegistrations,
    attendanceRate: pastRegs ? Math.round((pastAttended / pastRegs) * 100) : 0,
    mostPopular: mostPopular && mostPopular.registrations ? { title: mostPopular.title, registrations: mostPopular.registrations } : null,
    byCategory: Object.entries(byCategoryMap).map(([category, count]) => ({ category, count })),
    monthlyRegistrations: months,
    perEvent,
  };
}

// GET /api/reports/summary
exports.summary = asyncHandler(async (req, res) => {
  res.json({ success: true, report: await buildSummary(req.user) });
});

// GET /api/reports/export  → CSV download
exports.exportCsv = asyncHandler(async (req, res) => {
  const r = await buildSummary(req.user);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Event', 'Category', 'Date', 'Status', 'Capacity', 'Registrations', 'Attended', 'Attendance %']];
  r.perEvent.forEach((e) => rows.push([
    e.title, e.category, new Date(e.date).toISOString().slice(0, 10), e.status, e.capacity, e.registrations, e.attended,
    e.registrations ? Math.round((e.attended / e.registrations) * 100) : 0,
  ]));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="eventsphere-report.csv"');
  res.send('\uFEFF' + rows.map((row) => row.map(esc).join(',')).join('\n'));
});
