export const customerConfig = {
  endpoint: '/customers',
  idField: 'id',
  nameField: 'name',
  searchKeys: ['name', 'phone', 'email', 'address'],
  columns: [
    { key: 'id', labelKey: 'ID' },
    { key: 'name', labelKey: 'customers.name' },
    { key: 'phone', labelKey: 'customers.phone' },
    { key: 'email', labelKey: 'customers.email' },
    { key: 'address', labelKey: 'customers.address' },
  ],
  fields: [
    { name: 'name', labelKey: 'customers.name', type: 'text', required: true },
    { name: 'phone', labelKey: 'customers.phone', type: 'text' },
    { name: 'email', labelKey: 'customers.email', type: 'email' },
    { name: 'address', labelKey: 'customers.address', type: 'textarea', fullWidth: true },
    { name: 'image', labelKey: 'customers.image', type: 'text', fullWidth: true },
  ],
};
