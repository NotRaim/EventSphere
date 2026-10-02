// Error with an HTTP status code. Thrown by controllers, formatted by middleware/error.js
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = ApiError;
