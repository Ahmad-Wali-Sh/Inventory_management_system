// Customer CRUD routes. Mounted at /api/customers.
const crudFactory = require('../utils/crudFactory');

module.exports = crudFactory({
  table: 'customers',
  columns: ['name', 'phone', 'email', 'address', 'image'],
  required: ['name'],
  orderBy: 'id DESC',
});
