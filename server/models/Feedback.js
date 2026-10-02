const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);
feedbackSchema.index({ userId: 1, eventId: 1 }, { unique: true }); // one review per user per event

module.exports = mongoose.model('Feedback', feedbackSchema);
