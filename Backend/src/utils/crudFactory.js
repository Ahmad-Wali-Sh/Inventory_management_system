// CRUD factory: builds a full express.Router for any table.
//
// Usage:
//   const router = crudFactory({
//     table: 'products',
//     columns: ['code', 'name', ...],   // columns the client may send (allow-list)
//   });
//
// Routes created:
//   GET    /       -> list all rows
//   GET    /:id    -> one row
//   POST   /       -> create a row
//   PUT    /:id    -> update the sent columns of a row
//   DELETE /:id    -> delete a row
//
// Express 5 passes errors thrown in async handlers to the error middleware,
// so no try/catch is needed here.
const express = require('express');
const pool = require('../config/db.config');
const AppError = require('./AppError');

/**
 * @param {object}   options
 * @param {string}   options.table                 table name
 * @param {string[]} options.columns               columns allowed in POST / PUT bodies
 * @param {string[]} [options.required=[]]         columns that must be sent on POST
 * @param {string}   [options.idColumn='id']
 * @param {string}   [options.orderBy='id']        ORDER BY used by the list route
 * @param {boolean}  [options.hasUpdatedAt=true]   set updated_at = NOW() on update
 * @returns {import('express').Router}
 */
function crudFactory({
  table,
  columns,
  required = [],
  idColumn = 'id',
  orderBy = 'id',
  hasUpdatedAt = true,
}) {
  const router = express.Router();

  // Keep only allowed columns from the request body, as [column, value] pairs.
  const pickColumns = (body = {}) =>
    columns.filter((col) => body[col] !== undefined).map((col) => [col, body[col]]);

  // Make sure :id is a positive whole number.
  const parseId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Invalid id');
    }
    return id;
  };

  // GET / -> list all rows
  router.get('/', async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
    res.json(rows);
  });

  // GET /:id -> one row
  router.get('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = $1`, [id]);
    if (rows.length === 0) throw new AppError(404, `${table} record not found`);
    res.json(rows[0]);
  });

  // POST / -> create a row
  router.post('/', async (req, res) => {
    const body = req.body || {};
    const missing = required.filter(
      (col) => body[col] === undefined || body[col] === null || body[col] === ''
    );
    if (missing.length) {
      throw new AppError(400, `Missing required fields: ${missing.join(', ')}`);
    }

    const pairs = pickColumns(body);
    if (pairs.length === 0) throw new AppError(400, 'No valid fields sent');

    const cols = pairs.map(([col]) => col);
    const values = pairs.map(([, val]) => val);
    const placeholders = cols.map((_, i) => `$${i + 1}`);

    const { rows } = await pool.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  });

  // PUT /:id -> update only the columns that were sent
  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const pairs = pickColumns(req.body);
    if (pairs.length === 0) throw new AppError(400, 'No valid fields sent');

    const sets = pairs.map(([col], i) => `${col} = $${i + 1}`);
    if (hasUpdatedAt) sets.push('updated_at = NOW()');
    const values = pairs.map(([, val]) => val);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE ${idColumn} = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) throw new AppError(404, `${table} record not found`);
    res.json(rows[0]);
  });

  // DELETE /:id -> delete a row, returns the deleted row
  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await pool.query(
      `DELETE FROM ${table} WHERE ${idColumn} = $1 RETURNING *`,
      [id]
    );
    if (rows.length === 0) throw new AppError(404, `${table} record not found`);
    res.json(rows[0]);
  });

  return router;
}

module.exports = crudFactory;
