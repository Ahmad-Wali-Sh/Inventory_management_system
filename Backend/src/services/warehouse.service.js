const pool = require('../config/db.config');
const AppError = require('../utils/AppError');

function requiredText(value, field, maxLength) {
  const text = String(value ?? '').trim();
  if (!text) throw new AppError(400, `${field} is required`);
  if (text.length > maxLength) throw new AppError(400, `${field} must be ${maxLength} characters or fewer`);
  return text;
}

async function listWarehouses() {
  const { rows } = await pool.query(`
    SELECT w.id, w.name, w.location, w.is_active, w.created_at,
           COUNT(DISTINCT s.product_id)::int AS product_count,
           COALESCE(SUM(s.quantity), 0)::text AS total_quantity
    FROM warehouses w
    LEFT JOIN stocks s ON s.warehouse_id = w.id
    GROUP BY w.id
    ORDER BY w.is_active DESC, w.name ASC
  `);
  return rows;
}

async function getWarehouse(idValue) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid warehouse ID');
  const { rows } = await pool.query(`
    SELECT w.id, w.name, w.location, w.is_active, w.created_at,
           COUNT(DISTINCT s.product_id)::int AS product_count,
           COALESCE(SUM(s.quantity), 0)::text AS total_quantity
    FROM warehouses w
    LEFT JOIN stocks s ON s.warehouse_id = w.id
    WHERE w.id = $1
    GROUP BY w.id
  `, [id]);
  if (!rows.length) throw new AppError(404, 'Warehouse not found');
  return rows[0];
}

async function createWarehouse(data) {
  const name = requiredText(data.name, 'Warehouse name', 100);
  const location = String(data.location ?? '').trim() || null;
  if (location && location.length > 255) throw new AppError(400, 'Location must be 255 characters or fewer');
  const { rows } = await pool.query(
    'INSERT INTO warehouses (name, location) VALUES ($1, $2) RETURNING id, name, location, is_active, created_at',
    [name, location]
  );
  return rows[0];
}

async function updateWarehouse(idValue, data) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid warehouse ID');
  const name = requiredText(data.name, 'Warehouse name', 100);
  const location = String(data.location ?? '').trim() || null;
  if (location && location.length > 255) throw new AppError(400, 'Location must be 255 characters or fewer');
  const isActive = data.isActive === undefined ? true : Boolean(data.isActive);
  if (!isActive) {
    const { rows: activeRows } = await pool.query('SELECT COUNT(*)::int AS count FROM warehouses WHERE is_active = TRUE AND id <> $1', [id]);
    if (activeRows[0].count === 0) throw new AppError(409, 'At least one warehouse must remain active');
  }
  const { rows } = await pool.query(`
    UPDATE warehouses
    SET name = $1, location = $2, is_active = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING id, name, location, is_active, created_at
  `, [name, location, isActive, id]);
  if (!rows.length) throw new AppError(404, 'Warehouse not found');
  return rows[0];
}

async function deactivateWarehouse(idValue) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid warehouse ID');
  const { rows: activeRows } = await pool.query('SELECT COUNT(*)::int AS count FROM warehouses WHERE is_active = TRUE AND id <> $1', [id]);
  if (activeRows[0].count === 0) throw new AppError(409, 'At least one warehouse must remain active');
  const { rows } = await pool.query(`
    UPDATE warehouses SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1 AND is_active = TRUE
    RETURNING id, name, location, is_active
  `, [id]);
  if (!rows.length) throw new AppError(404, 'Active warehouse not found');
  return rows[0];
}

module.exports = { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, deactivateWarehouse };
