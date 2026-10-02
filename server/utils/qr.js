const QRCode = require('qrcode');

// The QR contains Event ID, User ID and Registration ID (as required by the brief)
exports.buildPayload = (reg) =>
  JSON.stringify({ e: String(reg.eventId._id || reg.eventId), u: String(reg.userId._id || reg.userId), r: reg.registrationId });

exports.toDataUrl = (reg) => QRCode.toDataURL(exports.buildPayload(reg), { margin: 1, width: 260 });
