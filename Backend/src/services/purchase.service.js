const { randomUUID } = require('node:crypto');
const pool = require('../config/db.config');
const AppError = require('../utils/AppError');
const { parseId, parseDecimal, validateDate } = require('../utils/documentValidation');

const makeInvoiceNo = () => `PUR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
const toCents = (value) => {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
};
const centsToDecimal = (cents) => `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;

async function getOptions() {
  const [suppliers, warehouses, products] = await Promise.all([
    pool.query('SELECT id, name FROM suppliers ORDER BY name'),
    pool.query('SELECT id, name FROM warehouses WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY name'),
    pool.query(`SELECT p.id, p.code, p.name, p.purchase_price::text AS purchase_price, u.short_name AS unit
                FROM products p LEFT JOIN units u ON u.id = p.unit_id ORDER BY p.name`),
  ]);
  return { suppliers: suppliers.rows, warehouses: warehouses.rows, products: products.rows };
}

async function listPurchases() {
  const { rows } = await pool.query(`
    SELECT p.id, p.invoice_no, p.purchase_date, p.total_amount::text, p.discount::text,
           p.grand_total::text, p.notes, p.created_at,
           s.id AS supplier_id, s.name AS supplier_name,
           w.id AS warehouse_id, w.name AS warehouse_name,
           COUNT(pi.id)::int AS item_count
    FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN warehouses w ON w.id = p.warehouse_id
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    GROUP BY p.id, s.id, s.name, w.id, w.name
    ORDER BY p.purchase_date DESC, p.id DESC
  `);
  return rows;
}

async function getPurchase(idValue) {
  const id = parseId(idValue, 'Purchase id');
  const header = await pool.query(`
    SELECT p.*, s.name AS supplier_name, w.name AS warehouse_name
    FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
    JOIN warehouses w ON w.id = p.warehouse_id WHERE p.id = $1
  `, [id]);
  if (!header.rows.length) throw new AppError(404, 'Purchase not found');
  const items = await pool.query(`
    SELECT pi.id, pi.product_id, pr.code AS product_code, pr.name AS product_name,
           u.short_name AS unit, pi.quantity::text, pi.unit_price::text, pi.line_total::text
    FROM purchase_items pi JOIN products pr ON pr.id = pi.product_id
    LEFT JOIN units u ON u.id = pr.unit_id WHERE pi.purchase_id = $1 ORDER BY pi.id
  `, [id]);
  return { ...header.rows[0], items: items.rows };
}

async function resolveUserId(client, suppliedUserId) {
  if (suppliedUserId !== undefined && suppliedUserId !== null && suppliedUserId !== '') {
    const id = parseId(suppliedUserId, 'User id');
    const result = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (!result.rows.length) throw new AppError(400, 'Selected user does not exist');
    return id;
  }
  // The current starter project uses demo-only frontend login without a real JWT user id.
  // Attribute purchases to an existing admin until real API authentication is connected.
  const result = await client.query(`SELECT id FROM users ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, id LIMIT 1`);
  if (!result.rows.length) throw new AppError(400, 'No application user exists. Run the original database seed first.');
  return result.rows[0].id;
}

async function createPurchase(data = {}) {
  const supplierId = parseId(data.supplierId, 'Supplier');
  const warehouseId = parseId(data.warehouseId, 'Warehouse');
  const purchaseDate = data.purchaseDate ? validateDate(data.purchaseDate, 'Purchase date') : new Date().toISOString().slice(0, 10);
  const discount = data.discount === undefined || data.discount === '' ? '0' : parseDecimal(data.discount, 'Discount', { allowZero: true });
  const notes = String(data.notes ?? '').trim() || null;
  const invoiceNo = String(data.invoiceNo ?? '').trim() || makeInvoiceNo();
  if (invoiceNo.length > 30) throw new AppError(400, 'Invoice number cannot exceed 30 characters');
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 100) {
    throw new AppError(400, 'A purchase must contain between 1 and 100 items');
  }
  const items = data.items.map((item, index) => ({
    productId: parseId(item.productId, `Item ${index + 1} product`),
    quantity: parseDecimal(item.quantity, `Item ${index + 1} quantity`),
    unitPrice: parseDecimal(item.unitPrice, `Item ${index + 1} unit price`, { allowZero: true }),
  }));
  if (new Set(items.map((item) => item.productId)).size !== items.length) {
    throw new AppError(400, 'A product can only appear once. Combine duplicate product lines.');
  }

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const supplier = await client.query('SELECT id FROM suppliers WHERE id = $1 FOR SHARE', [supplierId]);
    if (!supplier.rows.length) throw new AppError(404, 'Supplier not found');
    const warehouse = await client.query('SELECT id FROM warehouses WHERE id = $1 AND COALESCE(is_active, TRUE) = TRUE FOR SHARE', [warehouseId]);
    if (!warehouse.rows.length) throw new AppError(404, 'Active warehouse not found');
    const userId = await resolveUserId(client, data.userId);

    const productIds = items.map((item) => item.productId);
    const products = await client.query('SELECT id FROM products WHERE id = ANY($1::int[])', [productIds]);
    if (products.rows.length !== items.length) throw new AppError(400, 'One or more selected products do not exist');

    // Calculate to cents using integers so floating-point math cannot corrupt money totals.
    const totalCents = items.reduce((sum, item) => {
      const productCents = toCents(item.quantity) * toCents(item.unitPrice);
      return sum + (productCents + 50n) / 100n; // round each line to the database's 2-decimal line_total
    }, 0n);
    const discountCents = toCents(discount);
    if (discountCents > totalCents) throw new AppError(400, 'Discount cannot exceed the purchase subtotal');

    const purchaseResult = await client.query(`
      INSERT INTO purchases (invoice_no, purchase_date, supplier_id, warehouse_id, user_id, total_amount, discount, notes)
      VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8)
      RETURNING id, invoice_no, purchase_date, total_amount::text, discount::text, grand_total::text
    `, [invoiceNo, purchaseDate, supplierId, warehouseId, userId, centsToDecimal(totalCents), centsToDecimal(discountCents), notes]);
    const purchase = purchaseResult.rows[0];

    for (const item of items) {
      // The 001 warehouse/stock migration installs a DB trigger on purchase_items.
      // It updates the warehouse balance and appends the stock ledger row atomically.
      await client.query(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price) VALUES ($1, $2, $3::numeric, $4::numeric)',
        [purchase.id, item.productId, item.quantity, item.unitPrice]
      );
    }

    await client.query('COMMIT');
    transactionOpen = false;
    return getPurchase(purchase.id);
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getOptions, listPurchases, getPurchase, createPurchase };
