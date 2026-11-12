const crudFactory = require('../utils/crudFactory');

module.exports = crudFactory({
  table: 'suppliers',
  columns: ['name', 'phone', 'email', 'address'],
  required: ['name'],
  orderBy: 'name, id',
});
