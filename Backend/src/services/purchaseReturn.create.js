// Transactional purchase return creation and stock updates.
const pool = require('../config/db.config');
const AppError = require('../utils/AppError');
const { getPurchaseReturn } = require('./purchaseReturn.queries');

async function sumDecimals(client, values) {
  const expression = values.map((_, index) => `$${index + 1}::numeric`).join(' + ');
  const { rows } = await client.query(`SELECT (${expression})::text AS total`, values);
  return rows[0].total;
}

async function resolvePurchaseItems(client, purchaseId, requestedItems) {
  const items = [];
  const usedSourceLines = new Set();

  for (const item of requestedItems) {
    const { rows } = await client.query(
      `SELECT product_id, unit_price::text AS unit_price
       FROM purchase_items
       WHERE id = $1 AND purchase_id = $2`,
      [item.purchaseItemId, purchaseId]
    );
    if (rows.length === 0) {
      throw new AppError(400, 'A selected item does not belong to this purchase');
    }

    const productId = rows[0].product_id;
    const unitPrice = rows[0].unit_price;
    const sourceKey = `${productId}:${unitPrice}`;
    if (usedSourceLines.has(sourceKey)) {
      throw new AppError(400, 'A purchase item can only be selected once per return');
    }
    usedSourceLines.add(sourceKey);

    const availability = await client.query(
      `SELECT COALESCE(SUM(pi.quantity), 0)::text AS purchased,
              COALESCE((
                SELECT SUM(pri.quantity)
                FROM purchase_return_items pri
                JOIN purchase_returns pr ON pr.id = pri.purchase_return_id
                WHERE pr.purchase_id = $1
                  AND pri.product_id = $2
                  AND pri.unit_price = $3::numeric
              ), 0)::text AS returned
       FROM purchase_items pi
       WHERE pi.purchase_id = $1
         AND pi.product_id = $2
         AND pi.unit_price = $3::numeric`,
      [purchaseId, productId, unitPrice]
    );
    const quantityCheck = await client.query(
      'SELECT $1::numeric > ($2::numeric - $3::numeric) AS exceeds',
      [item.quantity, availability.rows[0].purchased, availability.rows[0].returned]
    );
    if (quantityCheck.rows[0].exceeds) {
      throw new AppError(400, `Return quantity exceeds the remaining purchased quantity for product ${productId}`);
    }

    items.push({ productId, quantity: item.quantity, unitPrice });
  }

  return items;
}

async function validateStock(client, warehouseId, items) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const productCheck = await client.query(
    'SELECT id FROM products WHERE id = ANY($1::int[])',
    [productIds]
  );
  if (productCheck.rows.length !== productIds.length) {
    throw new AppError(400, 'One or more selected products do not exist');
  }

  const quantitiesByProduct = new Map();
  for (const item of items) {
    const quantities = quantitiesByProduct.get(item.productId) || [];
    quantities.push(item.quantity);
    quantitiesByProduct.set(item.productId, quantities);
  }

  const stockRows = await client.query(
    `SELECT product_id, quantity::text AS quantity
     FROM stocks
     WHERE warehouse_id = $1 AND product_id = ANY($2::int[])
     ORDER BY product_id
     FOR UPDATE`,
    [warehouseId, [...quantitiesByProduct.keys()]]
  );
  const stockByProduct = new Map(stockRows.rows.map((row) => [row.product_id, row.quantity]));

  for (const [productId, quantities] of quantitiesByProduct) {
    const requestedQuantity = await sumDecimals(client, quantities);
    const availableQuantity = stockByProduct.get(productId) || '0';
    const quantityCheck = await client.query(
      'SELECT $1::numeric > $2::numeric AS exceeds',
      [requestedQuantity, availableQuantity]
    );
    if (quantityCheck.rows[0].exceeds) {
      throw new AppError(409, `Insufficient stock for product ${productId}`);
    }
  }
}

async function insertPurchaseReturn(client, data, supplierId, warehouseId, items) {
  const { rows } = await client.query(
    `INSERT INTO purchase_returns
       (return_no, return_date, purchase_id, supplier_id, warehouse_id, user_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [data.returnNo, data.returnDate, data.purchaseId, supplierId, warehouseId, data.userId, data.reason]
  );
  const returnId = rows[0].id;

  for (const item of items) {
    await client.query(
      `INSERT INTO purchase_return_items
         (purchase_return_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [returnId, item.productId, item.quantity, item.unitPrice]
    );
    await client.query(
      `UPDATE stocks
       SET quantity = quantity - $1::numeric, updated_at = NOW()
       WHERE product_id = $2 AND warehouse_id = $3`,
      [item.quantity, item.productId, warehouseId]
    );
  }

  await client.query(
    `UPDATE purchase_returns
     SET total_amount = (
       SELECT COALESCE(SUM(line_total), 0)
       FROM purchase_return_items
       WHERE purchase_return_id = $1
     ), updated_at = NOW()
     WHERE id = $1`,
    [returnId]
  );

  return returnId;
}

async function createPurchaseReturn(data) {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    let supplierId = data.supplierId;
    let warehouseId = data.warehouseId;
    let items = data.items;

    if (data.purchaseId) {
      const { rows } = await client.query(
        'SELECT supplier_id, warehouse_id FROM purchases WHERE id = $1 FOR UPDATE',
        [data.purchaseId]
      );
      if (rows.length === 0) throw new AppError(404, 'Purchase not found');

      supplierId = rows[0].supplier_id;
      warehouseId = rows[0].warehouse_id;
      items = await resolvePurchaseItems(client, data.purchaseId, data.items);
    }

    await validateStock(client, warehouseId, items);
    const returnId = await insertPurchaseReturn(client, data, supplierId, warehouseId, items);
    const result = await getPurchaseReturn(returnId, client);

    await client.query('COMMIT');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back purchase return transaction:', rollbackError);
        throw rollbackError;
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = createPurchaseReturn;
