const { validationResult } = require('express-validator');

// Put after express-validator chains. Returns the first validation message.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array().map((e) => ({ field: e.path, message: e.msg })) });
};
