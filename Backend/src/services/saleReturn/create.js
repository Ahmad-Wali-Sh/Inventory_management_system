// Transactional sale return creation and stock restoration.
const pool = require('../../config/db.config');
const AppError = require('../../utils/AppError');
const { getSaleReturn } = require('./queries');

async function resolveSaleItems(client, saleId, requestedItems, excludeReturnId = null) {
  const items = [];
  const usedSourceLines = new Set();

  for (const item of requestedItems) {
    const { rows } = await client.query(
      `SELECT product_id, unit_price::text AS unit_price
       FROM sale_items
       WHERE id = $1 AND sale_id = $2`,
      [item.saleItemId, saleId]
    );
    if (rows.length === 0) {
      throw new AppError(400, 'A selected item does not belong to this sale');
    }

    const { product_id: productId, unit_price: unitPrice } = rows[0];
    const sourceKey = `${productId}:${unitPrice}`;
    if (usedSourceLines.has(sourceKey)) {
      throw new AppError(400, 'A sale item can only be selected once per return');
    }
    usedSourceLines.add(sourceKey);

    const { rows: availabilityRows } = await client.query(
      `SELECT COALESCE(SUM(si.quantity), 0)::text AS sold,
              COALESCE((
                SELECT SUM(sri.quantity)
                FROM sale_return_items sri
                JOIN sale_returns sr ON sr.id = sri.sale_return_id
                WHERE sr.sale_id = $1
                  AND ($4::int IS NULL OR sr.id <> $4)
                  AND sri.product_id = $2
                  AND sri.unit_price = $3::numeric
              ), 0)::text AS returned
       FROM sale_items si
       WHERE si.sale_id = $1
         AND si.product_id = $2
         AND si.unit_price = $3::numeric`,
      [saleId, productId, unitPrice, excludeReturnId]
    );
    const { rows: quantityRows } = await client.query(
      'SELECT $1::numeric > ($2::numeric - $3::numeric) AS exceeds',
      [item.quantity, availabilityRows[0].sold, availabilityRows[0].returned]
    );
    if (quantityRows[0].exceeds) {
      throw new AppError(400, `Return quantity exceeds the remaining sold quantity for product ${productId}`);
    }

    items.push({ productId, quantity: item.quantity, unitPrice });
  }

  return items;
}

async function validateProducts(client, items) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const { rows } = await client.query(
    'SELECT id FROM products WHERE id = ANY($1::int[])',
    [productIds]
  );
  if (rows.length !== productIds.length) {
    throw new AppError(400, 'One or more selected products do not exist');
  }
}

async function lockSales(client, saleIds) {
  const ids = [...new Set(saleIds.filter(Boolean))].sort((a, b) => a - b);
  for (const id of ids) {
    const { rows } = await client.query('SELECT id FROM sales WHERE id = $1 FOR UPDATE', [id]);
    if (rows.length === 0) throw new AppError(404, 'Sale not found');
  }
}

async function readSaleReturnForUpdate(client, returnId) {
  const { rows } = await client.query(
    `SELECT id, sale_id, warehouse_id
     FROM sale_returns
     WHERE id = $1
     FOR UPDATE`,
    [returnId]
  );
  if (rows.length === 0) throw new AppError(404, 'Sale return not found');

  const { rows: items } = await client.query(
    `SELECT product_id, quantity::text AS quantity, unit_price::text AS unit_price
     FROM sale_return_items
     WHERE sale_return_id = $1
     ORDER BY id`,
    [returnId]
  );
  return { ...rows[0], items };
}

async function resolveReturnDetails(client, data, excludeReturnId = null) {
  let customerId = data.customerId;
  let warehouseId = data.warehouseId;
  let items = data.items;

  if (data.saleId) {
    const { rows } = await client.query(
      'SELECT customer_id, warehouse_id FROM sales WHERE id = $1',
      [data.saleId]
    );
    if (rows.length === 0) throw new AppError(404, 'Sale not found');
    customerId = rows[0].customer_id;
    warehouseId = rows[0].warehouse_id;
    items = await resolveSaleItems(client, data.saleId, data.items, excludeReturnId);
  } else {
    await validateProducts(client, items);
  }

  return { customerId, warehouseId, items };
}

async function applyStockDelta(client, deltas) {
  const orderedDeltas = [...deltas.values()].sort((first, second) => (
    first.warehouseId - second.warehouseId || first.productId - second.productId
  ));
  for (const { warehouseId, productId, quantities } of orderedDeltas) {
    const expression = quantities.map((_, index) => `$${index + 1}::numeric`).join(' + ');
    const { rows: totalRows } = await client.query(
      `SELECT (${expression})::text AS quantity`,
      quantities
    );
    const quantity = totalRows[0].quantity;
    const { rows: signRows } = await client.query(
      'SELECT $1::numeric < 0 AS is_negative, $1::numeric = 0 AS is_zero',
      [quantity]
    );
    if (signRows[0].is_zero) continue;

    const result = signRows[0].is_negative
      ? await client.query(
        `UPDATE stocks
         SET quantity = quantity + $1::numeric, updated_at = NOW()
         WHERE product_id = $2 AND warehouse_id = $3
           AND quantity + $1::numeric >= 0
         RETURNING id`,
        [quantity, productId, warehouseId]
      )
      : await client.query(
        `INSERT INTO stocks (product_id, warehouse_id, quantity)
         VALUES ($1, $2, $3::numeric)
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET quantity = stocks.quantity + EXCLUDED.quantity, updated_at = NOW()
         RETURNING id`,
        [productId, warehouseId, quantity]
      );
    if (result.rows.length === 0) {
      throw new AppError(409, `Cannot reverse this return because product ${productId} no longer has enough stock`);
    }
  }
}

function stockDeltas(previousReturn, nextItems, nextWarehouseId) {
  const deltas = new Map();
  const addDelta = (warehouseId, productId, quantity) => {
    const key = `${warehouseId}:${productId}`;
    const current = deltas.get(key) || { warehouseId, productId, quantities: [] };
    current.quantities.push(quantity);
    deltas.set(key, current);
  };
  const previous = previousReturn?.items || [];
  for (const item of previous) {
    addDelta(previousReturn.warehouse_id, item.product_id, `-${item.quantity}`);
  }
  for (const item of nextItems) addDelta(nextWarehouseId, item.productId, item.quantity);
  return deltas;
}

async function insertSaleReturn(client, data, customerId, warehouseId, items) {
  const { rows } = await client.query(
    `INSERT INTO sale_returns
       (return_no, return_date, sale_id, customer_id, warehouse_id, user_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [data.returnNo, data.returnDate, data.saleId, customerId, warehouseId, data.userId, data.reason]
  );
  const returnId = rows[0].id;

  for (const item of items) {
    await client.query(
      `INSERT INTO sale_return_items
         (sale_return_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [returnId, item.productId, item.quantity, item.unitPrice]
    );
  }
  const deltas = stockDeltas(null, items, warehouseId);
  await applyStockDelta(client, deltas);

  await client.query(
    `UPDATE sale_returns
     SET total_amount = (
       SELECT COALESCE(SUM(line_total), 0)
       FROM sale_return_items
       WHERE sale_return_id = $1
     ), updated_at = NOW()
     WHERE id = $1`,
    [returnId]
  );

  return returnId;
}

async function createSaleReturn(data) {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    await lockSales(client, [data.saleId]);
    const { customerId, warehouseId, items } = await resolveReturnDetails(client, data);
    const returnId = await insertSaleReturn(client, data, customerId, warehouseId, items);
    const result = await getSaleReturn(returnId, client);

    await client.query('COMMIT');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back sale return transaction:', rollbackError);
        throw rollbackError;
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function updateSaleReturn(returnIdValue, data) {
  const returnId = Number(returnIdValue);
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const previousReturn = await readSaleReturnForUpdate(client, returnId);
    await lockSales(client, [previousReturn.sale_id, data.saleId]);
    const { customerId, warehouseId, items } = await resolveReturnDetails(client, data, returnId);
    const deltas = stockDeltas(previousReturn, items, warehouseId);

    await client.query(
      `UPDATE sale_returns
       SET return_no = $1, return_date = $2, sale_id = $3, customer_id = $4,
           warehouse_id = $5, user_id = $6, reason = $7, updated_at = NOW()
       WHERE id = $8`,
      [data.returnNo, data.returnDate, data.saleId, customerId, warehouseId, data.userId, data.reason, returnId]
    );
    await client.query('DELETE FROM sale_return_items WHERE sale_return_id = $1', [returnId]);
    for (const item of items) {
      await client.query(
        `INSERT INTO sale_return_items
           (sale_return_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [returnId, item.productId, item.quantity, item.unitPrice]
      );
    }
    await applyStockDelta(client, deltas);
    await client.query(
      `UPDATE sale_returns
       SET total_amount = (
         SELECT COALESCE(SUM(line_total), 0)
         FROM sale_return_items
         WHERE sale_return_id = $1
       )
       WHERE id = $1`,
      [returnId]
    );

    const result = await getSaleReturn(returnId, client);
    await client.query('COMMIT');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back sale return update transaction:', rollbackError);
        throw rollbackError;
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function deleteSaleReturn(returnIdValue) {
  const returnId = Number(returnIdValue);
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const previousReturn = await readSaleReturnForUpdate(client, returnId);
    await lockSales(client, [previousReturn.sale_id]);

    const deltas = stockDeltas(previousReturn, [], previousReturn.warehouse_id);
    await applyStockDelta(client, deltas);
    await client.query('DELETE FROM sale_returns WHERE id = $1', [returnId]);

    await client.query('COMMIT');
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back sale return deletion transaction:', rollbackError);
        throw rollbackError;
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createSaleReturn, updateSaleReturn, deleteSaleReturn };
