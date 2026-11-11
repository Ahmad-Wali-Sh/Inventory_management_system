// Sales API. Sales are saved transactionally and update per-warehouse stock.
const express = require('express');
const pool = require('../config/db.config');
const AppError = require('../utils/AppError');

const router = express.Router();
const asId = (value, label) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, `${label} is invalid`);
  return n;
};
const asMoney = (value, label, min = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) throw new AppError(400, `${label} is invalid`);
  return n;
};

router.get('/options', async (req, res) => {
  const [customers, warehouses, users, products] = await Promise.all([
    pool.query('SELECT id, name, phone FROM customers ORDER BY name'),
    pool.query('SELECT id, name FROM warehouses ORDER BY name'),
    pool.query('SELECT id, username FROM users ORDER BY username'),
    pool.query(`SELECT p.id, p.code, p.name, p.sale_price,
                       COALESCE(json_agg(json_build_object('warehouse_id', s.warehouse_id, 'quantity', s.quantity))
                         FILTER (WHERE s.id IS NOT NULL), '[]'::json) AS stock_by_warehouse
                FROM products p LEFT JOIN stocks s ON s.product_id = p.id
                GROUP BY p.id ORDER BY p.name`),
  ]);
  res.json({
    customers: customers.rows,
    warehouses: warehouses.rows,
    users: users.rows,
    products: products.rows,
  });
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.id, s.invoice_no, s.sale_date, s.customer_id, c.name AS customer_name,
           s.warehouse_id, w.name AS warehouse_name, s.user_id, u.username,
           s.total_amount, s.discount, s.grand_total, s.notes,
           COUNT(si.id)::int AS item_count
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    JOIN warehouses w ON w.id = s.warehouse_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    GROUP BY s.id, c.name, w.name, u.username
    ORDER BY s.sale_date DESC, s.id DESC
  `);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const id = asId(req.params.id, 'Sale ID');
  const sale = await pool.query(`
    SELECT s.*, c.name AS customer_name, w.name AS warehouse_name, u.username
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    JOIN warehouses w ON w.id = s.warehouse_id
    JOIN users u ON u.id = s.user_id
    WHERE s.id = $1
  `, [id]);
  if (!sale.rowCount) throw new AppError(404, 'Sale not found');
  const items = await pool.query(`
    SELECT si.id, si.product_id, p.code, p.name AS product_name,
           si.quantity, si.unit_price, si.line_total
    FROM sale_items si JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = $1 ORDER BY si.id
  `, [id]);
  res.json({ ...sale.rows[0], items: items.rows });
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  const customerId = asId(body.customer_id, 'Customer');
  const warehouseId = asId(body.warehouse_id, 'Warehouse');
  const userId = asId(body.user_id, 'User');
  const discount = asMoney(body.discount ?? 0, 'Discount');
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError(400, 'Add at least one product to the sale');
  }

  const normalized = body.items.map((item) => ({
    product_id: asId(item.product_id, 'Product'),
    quantity: asMoney(item.quantity, 'Quantity', Number.EPSILON),
    unit_price: asMoney(item.unit_price, 'Unit price'),
  }));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customer = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    const warehouse = await client.query('SELECT id FROM warehouses WHERE id = $1', [warehouseId]);
    const user = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!customer.rowCount) throw new AppError(400, 'Selected customer does not exist');
    if (!warehouse.rowCount) throw new AppError(400, 'Selected warehouse does not exist');
    if (!user.rowCount) throw new AppError(400, 'Selected user does not exist');

    let total = 0;
    const requiredByProduct = new Map();
    for (const item of normalized) {
      const product = await client.query('SELECT id FROM products WHERE id = $1', [item.product_id]);
      if (!product.rowCount) throw new AppError(400, `Product ${item.product_id} does not exist`);
      requiredByProduct.set(item.product_id, (requiredByProduct.get(item.product_id) || 0) + item.quantity);
      total += item.quantity * item.unit_price;
    }
    for (const [productId, requiredQuantity] of requiredByProduct) {
      const stock = await client.query(
        'SELECT quantity FROM stocks WHERE product_id = $1 AND warehouse_id = $2 FOR UPDATE',
        [productId, warehouseId]
      );
      const available = Number(stock.rows[0]?.quantity ?? 0);
      if (available < requiredQuantity) {
        throw new AppError(400, `Insufficient stock for product ${productId}. Available: ${available}`);
      }
    }
    if (discount > total) throw new AppError(400, 'Discount cannot exceed the sale total');

    const invoiceNo = `SAL-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const inserted = await client.query(`
      INSERT INTO sales (invoice_no, sale_date, customer_id, warehouse_id, user_id, total_amount, discount, notes)
      VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [invoiceNo, body.sale_date || null, customerId, warehouseId, userId, total.toFixed(2), discount.toFixed(2), body.notes || null]);
    const sale = inserted.rows[0];

    for (const item of normalized) {
      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [sale.id, item.product_id, item.quantity, item.unit_price]
      );
      await client.query(
        'UPDATE stocks SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3',
        [item.quantity, item.product_id, warehouseId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...sale, items: normalized });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const id = asId(req.params.id, 'Sale ID');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saleResult = await client.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [id]);
    if (!saleResult.rowCount) throw new AppError(404, 'Sale not found');
    const sale = saleResult.rows[0];
    const items = await client.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = $1', [id]);
    for (const item of items.rows) {
      await client.query(`
        INSERT INTO stocks (product_id, warehouse_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = stocks.quantity + EXCLUDED.quantity, updated_at = NOW()
      `, [item.product_id, sale.warehouse_id, item.quantity]);
    }
    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ message: 'Sale deleted and stock restored', id });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

module.exports = router;
