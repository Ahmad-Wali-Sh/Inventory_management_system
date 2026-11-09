// Everything MasterComponent needs to know about products.
// Field names match the columns allowed in backend/src/routes/product.routes.js.
//
// To make a CRUD page for another model (e.g. users), copy this file,
// change endpoint / columns / fields, and render <MasterComponent config={...} />.

// Show money with 2 decimals (the API sends NUMERIC as a string like "12.50").
const money = (value) => Number(value ?? 0).toFixed(2);

export const productConfig = {
  endpoint: '/products',
  idField: 'id',
  nameField: 'name',
  searchKeys: ['code', 'name', 'description'],

  // ---------- Table (List tab) ----------
  columns: [
    { key: 'id', labelKey: 'ID' }, // a key that is not in the locale files is shown as-is
    { key: 'code', labelKey: 'products.code' },
    { key: 'name', labelKey: 'products.name' },
    { key: 'category_id', labelKey: 'products.category' },
    { key: 'unit_id', labelKey: 'products.unit' },
    { key: 'purchase_price', labelKey: 'products.purchasePrice', align: 'end', render: (row) => money(row.purchase_price) },
    { key: 'sale_price', labelKey: 'products.salePrice', align: 'end', render: (row) => money(row.sale_price) },
    { key: 'reorder_level', labelKey: 'products.reorderLevel', align: 'end' },
  ],

  // ---------- Form (New / Edit tabs) ----------
  fields: [
    { name: 'code', labelKey: 'products.code', type: 'text', required: true },
    { name: 'name', labelKey: 'products.name', type: 'text', required: true },
    // TODO(students): turn these into <select>s when /api/categories and /api/units exist:
    //   { name: 'category_id', type: 'select', options: categories.map(c => ({ value: c.id, label: c.name })) }
    { name: 'category_id', labelKey: 'products.category', type: 'number', required: true, min: 1 },
    { name: 'unit_id', labelKey: 'products.unit', type: 'number', required: true, min: 1 },
    { name: 'purchase_price', labelKey: 'products.purchasePrice', type: 'number', step: '0.01', min: 0, defaultValue: 0 },
    { name: 'sale_price', labelKey: 'products.salePrice', type: 'number', step: '0.01', min: 0, defaultValue: 0 },
    { name: 'reorder_level', labelKey: 'products.reorderLevel', type: 'number', step: '0.01', min: 0, defaultValue: 0 },
    { name: 'description', labelKey: 'products.description', type: 'textarea' },
  ],
};