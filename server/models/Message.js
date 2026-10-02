const mongoose = require('mongoose');

module.exports = mongoose.model('Message', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, trim: true, maxlength: 120, default: 'General help' },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new' },
}, { timestamps: true }));
