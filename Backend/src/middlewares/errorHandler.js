// Unknown route -> 404
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Turn PostgreSQL error codes into friendly HTTP errors.
// Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const pgErrors = {
  23505: [409, 'A record with this value already exists'], // unique_violation
  23503: [409, 'Related record not found or still in use'], // foreign_key_violation
  23502: [400, 'A required field is missing'], // not_null_violation
  23514: [400, 'A value is not allowed'], // check_violation
  '22P02': [400, 'Invalid value format'], // invalid_text_representation
  22003: [400, 'A number is out of range'], // numeric_value_out_of_range
  22001: [400, 'A text value is too long'], // string_data_right_truncation
};

// Central error handler. It must have 4 arguments so Express treats it as one.
// Express 5 sends errors from async routes here automatically.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Errors we threw on purpose (AppError) or body-parser errors (bad JSON)
  if (err.status) {
    const message = err.type === 'entity.parse.failed' ? 'Invalid JSON body' : err.message;
    return res.status(err.status).json({ message });
  }

  // Known PostgreSQL errors
  if (pgErrors[err.code]) {
    const [status, message] = pgErrors[err.code];
    return res.status(status).json({ message, detail: err.detail });
  }

  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
