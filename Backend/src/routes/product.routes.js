// Product CRUD routes, built with the CRUD factory.
// Mounted at /api/products in app.js.
const crudFactory = require('../utils/crudFactory');

const router = crudFactory({
  table: 'products',
  columns: [
    'code',
    'name',
    'category_id',
    'unit_id',
    'purchase_price',
    'sale_price',
    'reorder_level',
    'description',
  ],
  required: ['code', 'name', 'category_id', 'unit_id'],
  orderBy: 'id',
});

module.exports = router;
