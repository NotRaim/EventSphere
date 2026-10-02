const jwt = require('jsonwebtoken');

// Creates a signed JWT that only contains the user id
exports.signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
