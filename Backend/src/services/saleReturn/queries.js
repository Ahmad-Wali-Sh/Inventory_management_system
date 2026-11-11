// Read-only queries for sale returns and their form options.
const pool = require('../../config/db.config');
const AppError = require('../../utils/AppError');
const { parseId } = require('../../utils/documentValidation');

async function listSaleReturns(queryable = pool) {
  const { rows } = await queryable.query(`
    SELECT sr.id, sr.return_no, sr.return_date, sr.sale_id, sa.invoice_no,
           sr.customer_id, c.name AS customer_name,
           sr.warehouse_id, w.name AS warehouse_name,
           sr.user_id, u.username AS user_name,
           sr.total_amount, sr.reason, COUNT(sri.id)::int AS item_count
    FROM sale_returns sr
    JOIN customers c ON c.id = sr.customer_id
    JOIN warehouses w ON w.id = sr.warehouse_id
    JOIN users u ON u.id = sr.user_id
    LEFT JOIN sales sa ON sa.id = sr.sale_id
    LEFT JOIN sale_return_items sri ON sri.sale_return_id = sr.id
    GROUP BY sr.id, sa.invoice_no, c.name, w.name, u.username
    ORDER BY sr.return_date DESC, sr.id DESC
  `);
  return rows;
}

async function getSaleReturn(value, queryable = pool) {
  const id = parseId(value, 'Sale return id');
  const { rows } = await queryable.query(
    `SELECT sr.id, sr.return_no, sr.return_date, sr.sale_id, sa.invoice_no,
            sr.customer_id, c.name AS customer_name,
            sr.warehouse_id, w.name AS warehouse_name,
            sr.user_id, u.username AS user_name,
            sr.total_amount, sr.reason, sr.created_at
     FROM sale_returns sr
     JOIN customers c ON c.id = sr.customer_id
     JOIN warehouses w ON w.id = sr.warehouse_id
     JOIN users u ON u.id = sr.user_id
     LEFT JOIN sales sa ON sa.id = sr.sale_id
     WHERE sr.id = $1`,
    [id]
  );
  if (rows.length === 0) throw new AppError(404, 'Sale return not found');

  const { rows: items } = await queryable.query(
    `SELECT sri.id, sri.product_id, p.code AS product_code, p.name AS product_name,
            sri.quantity, sri.unit_price, sri.line_total
     FROM sale_return_items sri
     JOIN products p ON p.id = sri.product_id
     WHERE sri.sale_return_id = $1
     ORDER BY sri.id`,
    [id]
  );
  return { ...rows[0], items };
}

async function getOptions(queryable = pool) {
  const [sales, saleItems, customers, warehouses, users, products] = await Promise.all([
    queryable.query(
      `SELECT sa.id, sa.invoice_no, sa.customer_id, c.name AS customer_name,
              sa.warehouse_id, w.name AS warehouse_name
       FROM sales sa
       JOIN customers c ON c.id = sa.customer_id
       JOIN warehouses w ON w.id = sa.warehouse_id
       ORDER BY sa.sale_date DESC, sa.id DESC`
    ),
    queryable.query(
      `SELECT MIN(si.id)::int AS sale_item_id, si.sale_id, si.product_id,
              p.code AS product_code, p.name AS product_name, si.unit_price::text AS unit_price,
              SUM(si.quantity)::text AS sold_quantity,
              COALESCE(returned.quantity, 0)::text AS returned_quantity,
              (SUM(si.quantity) - COALESCE(returned.quantity, 0))::text AS available_quantity
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       LEFT JOIN LATERAL (
         SELECT SUM(sri.quantity)::numeric AS quantity
         FROM sale_return_items sri
         JOIN sale_returns sr ON sr.id = sri.sale_return_id
         WHERE sr.sale_id = si.sale_id
           AND sri.product_id = si.product_id
           AND sri.unit_price = si.unit_price
       ) returned ON true
       GROUP BY si.sale_id, si.product_id, p.code, p.name, si.unit_price, returned.quantity
       ORDER BY si.sale_id, p.name`
    ),
    queryable.query('SELECT id, name FROM customers ORDER BY name'),
    queryable.query('SELECT id, name FROM warehouses ORDER BY name'),
    queryable.query('SELECT id, username FROM users ORDER BY username'),
    queryable.query(
      `SELECT id, code, name, sale_price::text AS sale_price
       FROM products
       ORDER BY name`
    ),
  ]);

  return {
    sales: sales.rows,
    saleItems: saleItems.rows,
    customers: customers.rows,
    warehouses: warehouses.rows,
    users: users.rows,
    products: products.rows,
  };
}

module.exports = { listSaleReturns, getSaleReturn, getOptions };
