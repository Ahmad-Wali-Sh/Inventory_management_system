// A small error class that carries an HTTP status code.
// Throw it anywhere in a route: throw new AppError(404, 'Not found')
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = AppError;
