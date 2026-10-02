const crypto = require('crypto');

// Unique, human-friendly registration ID, e.g. EVS-7F3A9C21
exports.generateRegistrationId = () => 'EVS-' + crypto.randomBytes(4).toString('hex').toUpperCase();

// Escape user input before it is used inside a RegExp (search boxes)
exports.escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Date + "HH:MM" string -> real Date (server local time)
exports.eventStart = (event) => {
  const day = new Date(event.date).toISOString().slice(0, 10);
  return new Date(`${day}T${event.time || '00:00'}:00`);
};

// Start of today in UTC (event dates are stored as UTC midnight)
exports.startOfToday = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

exports.CATEGORIES = [
  'Technology', 'Cultural', 'Sports', 'Business', 'Education',
  'Music', 'Workshop', 'Competition', 'Seminar'
];

// Adds availableSeats to plain (lean) event objects
exports.addSeats = (e) => { if (e) e.availableSeats = Math.max(0, e.capacity - e.registeredCount); return e; };
