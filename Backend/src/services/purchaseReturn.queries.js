// Read-only queries for purchase returns and their form options.
const pool = require('../config/db.config');
const AppError = require('../utils/AppError');
const { parseId } = require('./purchaseReturn.validation');

async function listPurchaseReturns(queryable = pool) {
  const { rows } = await queryable.query(`
    SELECT pr.id, pr.return_no, pr.return_date, pr.purchase_id, pu.invoice_no,
           pr.supplier_id, s.name AS supplier_name,
           pr.warehouse_id, w.name AS warehouse_name,
           pr.user_id, u.username AS user_name,
           pr.total_amount, pr.reason, COUNT(pri.id)::int AS item_count
    FROM purchase_returns pr
    JOIN suppliers s ON s.id = pr.supplier_id
    JOIN warehouses w ON w.id = pr.warehouse_id
    JOIN users u ON u.id = pr.user_id
    LEFT JOIN purchases pu ON pu.id = pr.purchase_id
    LEFT JOIN purchase_return_items pri ON pri.purchase_return_id = pr.id
    GROUP BY pr.id, pu.invoice_no, s.name, w.name, u.username
    ORDER BY pr.return_date DESC, pr.id DESC
  `);
  return rows;
}

async function getPurchaseReturn(value, queryable = pool) {
  const id = parseId(value, 'Purchase return id');
  const { rows } = await queryable.query(
    `SELECT pr.id, pr.return_no, pr.return_date, pr.purchase_id, pu.invoice_no,
            pr.supplier_id, s.name AS supplier_name,
            pr.warehouse_id, w.name AS warehouse_name,
            pr.user_id, u.username AS user_name,
            pr.total_amount, pr.reason, pr.created_at
     FROM purchase_returns pr
     JOIN suppliers s ON s.id = pr.supplier_id
     JOIN warehouses w ON w.id = pr.warehouse_id
     JOIN users u ON u.id = pr.user_id
     LEFT JOIN purchases pu ON pu.id = pr.purchase_id
     WHERE pr.id = $1`,
    [id]
  );
  if (rows.length === 0) throw new AppError(404, 'Purchase return not found');

  const { rows: items } = await queryable.query(
    `SELECT pri.id, pri.product_id, p.code AS product_code, p.name AS product_name,
            pri.quantity, pri.unit_price, pri.line_total
     FROM purchase_return_items pri
     JOIN products p ON p.id = pri.product_id
     WHERE pri.purchase_return_id = $1
     ORDER BY pri.id`,
    [id]
  );
  return { ...rows[0], items };
}

async function getOptions(queryable = pool) {
  const [purchases, purchaseItems, suppliers, warehouses, users, products, stocks] =
    await Promise.all([
      queryable.query(
        `SELECT pu.id, pu.invoice_no, pu.supplier_id, s.name AS supplier_name,
                pu.warehouse_id, w.name AS warehouse_name
         FROM purchases pu
         JOIN suppliers s ON s.id = pu.supplier_id
         JOIN warehouses w ON w.id = pu.warehouse_id
         ORDER BY pu.purchase_date DESC, pu.id DESC`
      ),
      queryable.query(
        `SELECT MIN(pi.id)::int AS purchase_item_id, pi.purchase_id, pi.product_id,
                p.code AS product_code, p.name AS product_name, pi.unit_price::text AS unit_price,
                SUM(pi.quantity)::text AS purchased_quantity,
                COALESCE(returned.quantity, 0)::text AS returned_quantity,
                (SUM(pi.quantity) - COALESCE(returned.quantity, 0))::text AS available_quantity
         FROM purchase_items pi
         JOIN products p ON p.id = pi.product_id
         LEFT JOIN LATERAL (
           SELECT SUM(pri.quantity)::numeric AS quantity
           FROM purchase_return_items pri
           JOIN purchase_returns pr ON pr.id = pri.purchase_return_id
           WHERE pr.purchase_id = pi.purchase_id
             AND pri.product_id = pi.product_id
             AND pri.unit_price = pi.unit_price
         ) returned ON true
         GROUP BY pi.purchase_id, pi.product_id, p.code, p.name, pi.unit_price, returned.quantity
         ORDER BY pi.purchase_id, p.name`
      ),
      queryable.query('SELECT id, name FROM suppliers ORDER BY name'),
      queryable.query('SELECT id, name FROM warehouses ORDER BY name'),
      queryable.query('SELECT id, username FROM users ORDER BY username'),
      queryable.query(
        `SELECT id, code, name, purchase_price::text AS purchase_price
         FROM products
         ORDER BY name`
      ),
      queryable.query(
        `SELECT product_id, warehouse_id, quantity::text AS quantity
         FROM stocks
         ORDER BY warehouse_id, product_id`
      ),
    ]);

  return {
    purchases: purchases.rows,
    purchaseItems: purchaseItems.rows,
    suppliers: suppliers.rows,
    warehouses: warehouses.rows,
    users: users.rows,
    products: products.rows,
    stocks: stocks.rows,
  };
}

module.exports = {
  listPurchaseReturns,
  getPurchaseReturn,
  getOptions,
};
