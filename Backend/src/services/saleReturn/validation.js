// Input validation and normalization for sale return documents.
const AppError = require('../../utils/AppError');
const { parseId, parseDecimal, validateDate } = require('../../utils/documentValidation');

function validateCreateSaleReturn(body = {}) {
  const returnNo = String(body.return_no ?? '').trim();
  if (!returnNo || returnNo.length > 30) {
    throw new AppError(400, 'Return number is required and must be at most 30 characters');
  }
  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    throw new AppError(400, 'Reason must be text');
  }

  const saleId = body.sale_id === undefined || body.sale_id === null || body.sale_id === ''
    ? null
    : parseId(body.sale_id, 'Sale');
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError(400, 'At least one return item is required');
  }

  const items = body.items.map((item, index) => {
    const label = `Item ${index + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new AppError(400, `${label} must be an object`);
    }

    const quantity = parseDecimal(item.quantity, `${label} quantity`);
    if (saleId) {
      return {
        saleItemId: parseId(item.sale_item_id, `${label} sale item`),
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
    saleId,
    userId: parseId(body.user_id, 'User'),
    customerId: saleId ? null : parseId(body.customer_id, 'Customer'),
    warehouseId: saleId ? null : parseId(body.warehouse_id, 'Warehouse'),
    reason: body.reason?.trim() || null,
    items,
  };
}

module.exports = { validateCreateSaleReturn };
