const ApiError = require('../utils/ApiError');

exports.notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// Central error formatter: every API error looks like { success:false, message }
exports.errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'CastError') { status = 404; message = 'Not found: invalid ID'; }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(', '); }
  else if (err.code === 11000) { status = 409; message = 'That record already exists'; }
  else if (/Mongo(Network|ServerSelection)|ECONNREFUSED/.test(err.name + err.message)) { status = 503; message = 'Database connection error. Please try again shortly'; }
  else if (status === 500) { console.error(err); message = 'Server error. Please try again'; }

  res.status(status).json({ success: false, message });
};
