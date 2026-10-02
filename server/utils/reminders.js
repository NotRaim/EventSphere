const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Favorite = require('../models/Favorite');
const { notify } = require('./notify');
const { eventStart } = require('./helpers');

// Runs on server start and then every hour.
// 1) "Your event is tomorrow"  2) "Registration deadline is approaching"
async function runReminders() {
  const now = Date.now();
  const in24h = now + 24 * 3600 * 1000;
  const in48h = now + 48 * 3600 * 1000;

  const events = await Event.find({ status: 'approved', date: { $gte: new Date(now - 86400000) } });

  for (const ev of events) {
    const start = eventStart(ev).getTime();

    if (start > now && start <= in24h) {
      const regs = await Registration.find({ eventId: ev._id, status: 'confirmed' });
      for (const r of regs) {
        await notify(r.userId, 'Your event is tomorrow', `"${ev.title}" starts at ${ev.time} at ${ev.location}.`, `reminder:${r._id}`);
      }
    }

    const deadline = new Date(ev.registrationDeadline).getTime();
    if (deadline > now && deadline <= in48h) {
      const favs = await Favorite.find({ eventId: ev._id });
      for (const f of favs) {
        const already = await Registration.exists({ eventId: ev._id, userId: f.userId, status: 'confirmed' });
        if (!already) {
          await notify(f.userId, 'Registration deadline is approaching', `Register for "${ev.title}" before it closes.`, `deadline:${ev._id}:${f.userId}`);
        }
      }
    }
  }
}

exports.startReminderJob = () => {
  const run = () => runReminders().catch((e) => console.error('Reminder job failed:', e.message));
  setTimeout(run, 5000);
  setInterval(run, 60 * 60 * 1000);
};
