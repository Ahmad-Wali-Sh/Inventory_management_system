export const supplierConfig = {
  endpoint: '/suppliers',
  idField: 'id',
  nameField: 'name',
  searchKeys: ['name', 'phone', 'email', 'address'],
  columns: [
    { key: 'id', labelKey: 'ID' },
    { key: 'name', labelKey: 'suppliers.name' },
    { key: 'phone', labelKey: 'suppliers.phone' },
    { key: 'email', labelKey: 'suppliers.email' },
    { key: 'address', labelKey: 'suppliers.address' },
  ],
  fields: [
    { name: 'name', labelKey: 'suppliers.name', type: 'text', required: true },
    { name: 'phone', labelKey: 'suppliers.phone', type: 'text' },
    { name: 'email', labelKey: 'suppliers.email', type: 'email' },
    { name: 'address', labelKey: 'suppliers.address', type: 'textarea', fullWidth: true },
  ],
};
