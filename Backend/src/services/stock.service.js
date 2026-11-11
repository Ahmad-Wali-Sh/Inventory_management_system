const { randomUUID } = require('node:crypto');
const pool = require('../config/db.config');
const AppError = require('../utils/AppError');

function positiveQuantity(value, field = 'Quantity') {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
    throw new AppError(400, `${field} must be a positive number with up to 2 decimal places`);
  }
  return text;
}

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, `${field} is invalid`);
  return id;
}

function reference(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function getSummary() {
  const { rows } = await pool.query(`
    WITH product_totals AS (
      SELECT p.id, p.reorder_level, COALESCE(SUM(s.quantity), 0) AS quantity
      FROM products p
      LEFT JOIN stocks s ON s.product_id = p.id
      GROUP BY p.id
    )
    SELECT
      (SELECT COUNT(*)::int FROM products) AS product_count,
      (SELECT COUNT(*)::int FROM warehouses WHERE is_active = TRUE) AS warehouse_count,
      COALESCE((SELECT SUM(s.quantity) FROM stocks s), 0)::text AS total_units,
      COALESCE((SELECT SUM(s.quantity * p.purchase_price) FROM stocks s JOIN products p ON p.id = s.product_id), 0)::text AS stock_value,
      (SELECT COUNT(*)::int FROM product_totals WHERE quantity < reorder_level) AS low_stock_count
  `);
  return rows[0];
}

async function listInventory(filters = {}) {
  const warehouseId = filters.warehouseId ? positiveId(filters.warehouseId, 'Warehouse') : null;
  const search = String(filters.search ?? '').trim();
  const { rows } = await pool.query(`
    SELECT p.id AS product_id, p.code, p.name AS product_name,
           p.purchase_price::text AS purchase_price, p.sale_price::text AS sale_price,
           p.reorder_level::text AS reorder_level,
           totals.total_quantity::text AS total_product_quantity,
           c.name AS category_name, u.short_name AS unit,
           w.id AS warehouse_id, w.name AS warehouse_name,
           COALESCE(s.quantity, 0)::text AS quantity,
           (COALESCE(s.quantity, 0) * p.purchase_price)::text AS stock_value
    FROM products p
    CROSS JOIN warehouses w
    JOIN LATERAL (
      SELECT COALESCE(SUM(all_stock.quantity), 0) AS total_quantity
      FROM stocks all_stock WHERE all_stock.product_id = p.id
    ) totals ON TRUE
    LEFT JOIN stocks s ON s.product_id = p.id AND s.warehouse_id = w.id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE w.is_active = TRUE
      AND ($1::int IS NULL OR w.id = $1)
      AND ($2 = '' OR p.name ILIKE '%' || $2 || '%' OR p.code ILIKE '%' || $2 || '%')
    ORDER BY p.name, w.name
  `, [warehouseId, search]);
  return rows;
}

async function listMovements(filters = {}) {
  const warehouseId = filters.warehouseId ? positiveId(filters.warehouseId, 'Warehouse') : null;
  const productId = filters.productId ? positiveId(filters.productId, 'Product') : null;
  const type = String(filters.type ?? '').trim();
  const allowedTypes = new Set(['purchase', 'sale', 'sale_return', 'purchase_return', 'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out']);
  if (type && !allowedTypes.has(type)) throw new AppError(400, 'Invalid movement type');
  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const { rows } = await pool.query(`
    SELECT m.id, m.created_at, m.movement_type, m.quantity_delta::text AS quantity_delta,
           m.reference_no, m.source_type, m.notes,
           p.id AS product_id, p.code AS product_code, p.name AS product_name, u.short_name AS unit,
           w.id AS warehouse_id, w.name AS warehouse_name
    FROM stock_movements m
    JOIN products p ON p.id = m.product_id
    JOIN warehouses w ON w.id = m.warehouse_id
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE ($1::int IS NULL OR m.warehouse_id = $1)
      AND ($2::int IS NULL OR m.product_id = $2)
      AND ($3 = '' OR m.movement_type = $3)
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT $4
  `, [warehouseId, productId, type, limit]);
  return rows;
}

async function ensureActiveWarehouse(client, id) {
  const { rows } = await client.query('SELECT id FROM warehouses WHERE id = $1 AND is_active = TRUE FOR UPDATE', [id]);
  if (!rows.length) throw new AppError(404, 'Active warehouse not found');
}

async function ensureProduct(client, id) {
  const { rows } = await client.query('SELECT id FROM products WHERE id = $1', [id]);
  if (!rows.length) throw new AppError(404, 'Product not found');
}

async function createAdjustment(data) {
  const warehouseId = positiveId(data.warehouseId, 'Warehouse');
  const productId = positiveId(data.productId, 'Product');
  const quantity = positiveQuantity(data.quantity);
  const direction = data.direction === 'decrease' ? 'decrease' : data.direction === 'increase' ? 'increase' : null;
  if (!direction) throw new AppError(400, 'Direction must be increase or decrease');
  const reason = String(data.reason ?? '').trim();
  if (reason.length < 3 || reason.length > 500) throw new AppError(400, 'Reason must be between 3 and 500 characters');
  const delta = direction === 'increase' ? quantity : `-${quantity}`;
  const adjustmentNo = reference('ADJ');
  const client = await pool.connect();
  let open = false;
  try {
    await client.query('BEGIN'); open = true;
    await ensureActiveWarehouse(client, warehouseId);
    await ensureProduct(client, productId);
    await client.query(
      'INSERT INTO stocks (product_id, warehouse_id, quantity) VALUES ($1, $2, 0) ON CONFLICT (product_id, warehouse_id) DO NOTHING',
      [productId, warehouseId]
    );
    await client.query('SELECT id FROM stocks WHERE product_id = $1 AND warehouse_id = $2 FOR UPDATE', [productId, warehouseId]);
    const update = direction === 'increase'
      ? await client.query(`UPDATE stocks SET quantity = quantity + $1::numeric, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3 RETURNING quantity::text`, [quantity, productId, warehouseId])
      : await client.query(`UPDATE stocks SET quantity = quantity - $1::numeric, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3 AND quantity >= $1::numeric RETURNING quantity::text`, [quantity, productId, warehouseId]);
    if (!update.rows.length) throw new AppError(409, 'Adjustment would make the warehouse stock negative');
    const { rows } = await client.query(`
      INSERT INTO stock_adjustments (adjustment_no, warehouse_id, product_id, quantity_delta, reason)
      VALUES ($1, $2, $3, $4::numeric, $5)
      RETURNING id, adjustment_no, warehouse_id, product_id, quantity_delta::text, reason, created_at
    `, [adjustmentNo, warehouseId, productId, delta, reason]);
    await client.query(`
      INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, reference_no, notes)
      VALUES ($1, $2, $3, $4::numeric, 'adjustment', $5, $6, $7)
    `, [warehouseId, productId, direction === 'increase' ? 'adjustment_in' : 'adjustment_out', delta, rows[0].id, adjustmentNo, reason]);
    await client.query('COMMIT'); open = false;
    return { ...rows[0], current_quantity: update.rows[0].quantity };
  } catch (error) {
    if (open) await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function createTransfer(data) {
  const sourceWarehouseId = positiveId(data.sourceWarehouseId, 'Source warehouse');
  const destinationWarehouseId = positiveId(data.destinationWarehouseId, 'Destination warehouse');
  if (sourceWarehouseId === destinationWarehouseId) throw new AppError(400, 'Source and destination warehouses must be different');
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 100) throw new AppError(400, 'Add between 1 and 100 transfer items');
  const notes = String(data.notes ?? '').trim() || null;
  const items = data.items.map((item) => ({ productId: positiveId(item.productId, 'Product'), quantity: positiveQuantity(item.quantity) }));
  const unique = new Set(items.map((item) => item.productId));
  if (unique.size !== items.length) throw new AppError(400, 'Each product can only appear once in a transfer');
  const transferNo = reference('TRF');
  const client = await pool.connect();
  let open = false;
  try {
    await client.query('BEGIN'); open = true;
    const warehouseIds = [sourceWarehouseId, destinationWarehouseId].sort((a, b) => a - b);
    const { rows: warehouses } = await client.query('SELECT id FROM warehouses WHERE id = ANY($1::int[]) AND is_active = TRUE ORDER BY id FOR UPDATE', [warehouseIds]);
    if (warehouses.length !== 2) throw new AppError(404, 'Both warehouses must exist and be active');
    for (const item of [...items].sort((a, b) => a.productId - b.productId)) {
      await ensureProduct(client, item.productId);
      await client.query(
        'INSERT INTO stocks (product_id, warehouse_id, quantity) VALUES ($1, $2, 0) ON CONFLICT (product_id, warehouse_id) DO NOTHING',
        [item.productId, sourceWarehouseId]
      );
      await client.query(
        'INSERT INTO stocks (product_id, warehouse_id, quantity) VALUES ($1, $2, 0) ON CONFLICT (product_id, warehouse_id) DO NOTHING',
        [item.productId, destinationWarehouseId]
      );
      await client.query('SELECT id FROM stocks WHERE product_id = $1 AND warehouse_id = ANY($2::int[]) ORDER BY warehouse_id FOR UPDATE', [item.productId, warehouseIds]);
      const decrement = await client.query(`
        UPDATE stocks SET quantity = quantity - $1::numeric, updated_at = NOW()
        WHERE product_id = $2 AND warehouse_id = $3 AND quantity >= $1::numeric
        RETURNING id
      `, [item.quantity, item.productId, sourceWarehouseId]);
      if (!decrement.rows.length) throw new AppError(409, `Insufficient stock for product ${item.productId} in the source warehouse`);
      await client.query(`
        UPDATE stocks SET quantity = quantity + $1::numeric, updated_at = NOW()
        WHERE product_id = $2 AND warehouse_id = $3
      `, [item.quantity, item.productId, destinationWarehouseId]);
    }
    const { rows: transferRows } = await client.query(`
      INSERT INTO stock_transfers (transfer_no, source_warehouse_id, destination_warehouse_id, notes)
      VALUES ($1, $2, $3, $4) RETURNING id, transfer_no, created_at
    `, [transferNo, sourceWarehouseId, destinationWarehouseId, notes]);
    const transferId = transferRows[0].id;
    for (const item of items) {
      await client.query('INSERT INTO stock_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, $3::numeric)', [transferId, item.productId, item.quantity]);
      await client.query(`
        INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, reference_no, notes)
        VALUES ($1, $2, 'transfer_out', -$3::numeric, 'transfer', $4, $5, $6),
               ($7, $2, 'transfer_in', $3::numeric, 'transfer', $4, $5, $6)
      `, [sourceWarehouseId, item.productId, item.quantity, transferId, transferNo, notes, destinationWarehouseId]);
    }
    await client.query('COMMIT'); open = false;
    return { ...transferRows[0], sourceWarehouseId, destinationWarehouseId, items };
  } catch (error) {
    if (open) await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

module.exports = { getSummary, listInventory, listMovements, createAdjustment, createTransfer };
