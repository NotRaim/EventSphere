const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    registrationDate: { type: Date, default: Date.now },
    registrationId: { type: String, required: true, unique: true }, // e.g. EVS-7F3A9C21 (goes into the QR)
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    attendance: { type: Boolean, default: false },
    attendedAt: { type: Date },
  },
  { timestamps: true }
);

// Database-level protection against duplicate registrations
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
