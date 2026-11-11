// Common validation helpers for inventory document forms.
const AppError = require('./AppError');

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    throw new AppError(400, `${label} must be a positive whole number`);
  }
  return id;
}

function parseDecimal(value, label, { allowZero = false } = {}) {
  const text = String(value ?? '');
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text)) {
    throw new AppError(400, `${label} must be a valid number with at most 2 decimal places`);
  }

  const [whole, fraction = ''] = text.split('.');
  if (!allowZero && /^0+$/.test(whole) && /^0*$/.test(fraction)) {
    throw new AppError(400, `${label} must be greater than zero`);
  }
  return text;
}

function validateDate(value, label = 'Return date') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) {
    throw new AppError(400, `${label} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, `${label} is not a valid date`);
  }
  return value;
}

module.exports = { parseId, parseDecimal, validateDate };
