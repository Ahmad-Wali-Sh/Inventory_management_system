// Input validation and normalization for purchase return documents.
const AppError = require('../utils/AppError');

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

function validateDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) {
    throw new AppError(400, 'Return date must use YYYY-MM-DD format');
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, 'Return date is not a valid date');
  }
  return value;
}

function validateCreatePurchaseReturn(body = {}) {
  const returnNo = String(body.return_no ?? '').trim();
  if (!returnNo || returnNo.length > 30) {
    throw new AppError(400, 'Return number is required and must be at most 30 characters');
  }

  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    throw new AppError(400, 'Reason must be text');
  }

  const purchaseId = body.purchase_id ? parseId(body.purchase_id, 'Purchase') : null;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError(400, 'At least one return item is required');
  }

  const items = body.items.map((item, index) => {
    const label = `Item ${index + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new AppError(400, `${label} must be an object`);
    }

    const quantity = parseDecimal(item.quantity, `${label} quantity`);
    if (purchaseId) {
      return {
        purchaseItemId: parseId(item.purchase_item_id, `${label} purchase item`),
        quantity,
      };
    }

    return {
      productId: parseId(item.product_id, `${label} product`),
      quantity,
      unitPrice: parseDecimal(item.unit_price, `${label} unit price`, { allowZero: true }),
    };
  });

  return {
    returnNo,
    returnDate: validateDate(body.return_date),
    purchaseId,
    userId: parseId(body.user_id, 'User'),
    supplierId: purchaseId ? null : parseId(body.supplier_id, 'Supplier'),
    warehouseId: purchaseId ? null : parseId(body.warehouse_id, 'Warehouse'),
    reason: body.reason?.trim() || null,
    items,
  };
}

module.exports = {
  parseId,
  parseDecimal,
  validateCreatePurchaseReturn,
};
