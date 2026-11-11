import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../layout/PageContainer';
import Icon from '../shared/components/Icon';
import { toast } from '../shared/stores/toastStore';
import warehousesApi from './api/warehousesApi';

const emptyForm = { name: '', location: '' };

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadWarehouses = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      setWarehouses(await warehousesApi.list());
    } catch (requestError) {
      setError(requestError.message || 'Could not load warehouses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(loadWarehouses); }, [loadWarehouses]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (warehouse) => {
    setEditingId(warehouse.id);
    setForm({ name: warehouse.name, location: warehouse.location || '' });
    setShowForm(true);
  };

  const saveWarehouse = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) await warehousesApi.update(editingId, { ...form, isActive: true });
      else await warehousesApi.create(form);
      toast.success(editingId ? 'Warehouse updated' : 'Warehouse created');
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadWarehouses();
    } catch (requestError) {
      toast.error(requestError.message || 'Could not save warehouse');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (warehouse) => {
    try {
      if (warehouse.is_active) {
        await warehousesApi.deactivate(warehouse.id);
        toast.success('Warehouse deactivated. Its stock and history were preserved.');
      } else {
        await warehousesApi.update(warehouse.id, { name: warehouse.name, location: warehouse.location || '', isActive: true });
        toast.success('Warehouse activated');
      }
      await loadWarehouses();
    } catch (requestError) {
      toast.error(requestError.message || 'Could not update warehouse status');
    }
  };

  return (
    <PageContainer
      title="Warehouses"
      actions={<button type="button" className="btn btn-primary" onClick={openCreate}><Icon name="plus" className="size-4" /> Add warehouse</button>}
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="card flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name="warehouse" className="size-6" /></span>
          <div><p className="text-sm text-fg-muted">Total warehouses</p><p className="text-2xl font-semibold">{warehouses.length}</p></div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-lg bg-success/10 text-success"><Icon name="box" className="size-6" /></span>
          <div><p className="text-sm text-fg-muted">Active warehouses</p><p className="text-2xl font-semibold">{warehouses.filter((item) => item.is_active).length}</p></div>
        </div>
        <div className="card flex items-center gap-4 p-4 sm:col-span-2 xl:col-span-1">
          <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-fg"><Icon name="layers" className="size-6" /></span>
          <div><p className="text-sm text-fg-muted">Units across warehouses</p><p className="text-2xl font-semibold">{warehouses.reduce((sum, item) => sum + Number(item.total_quantity || 0), 0).toLocaleString()}</p></div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={saveWarehouse} className="card mb-5 p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">{editingId ? 'Edit warehouse' : 'Create warehouse'}</h2><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Close</button></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Warehouse name<input className="input mt-1" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Main Warehouse" /></label>
            <label className="text-sm font-medium">Location<input className="input mt-1" maxLength={255} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City, address or branch" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save warehouse'}</button></div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-line p-4"><h2 className="font-semibold">Warehouse directory</h2><p className="mt-1 text-sm text-fg-muted">Manage locations without deleting their inventory or transaction history.</p></div>
        {loading ? <p className="p-8 text-center text-sm text-fg-muted">Loading warehouses...</p> : error ? <div className="p-8 text-center"><p className="mb-3 text-sm text-danger">{error}</p><button className="btn btn-secondary" onClick={loadWarehouses}>Try again</button></div> : warehouses.length === 0 ? <p className="p-8 text-center text-sm text-fg-muted">No warehouses have been created yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted text-start text-xs uppercase text-fg-muted"><tr><th className="px-4 py-3 text-start">Warehouse</th><th className="px-4 py-3 text-start">Location</th><th className="px-4 py-3 text-end">Products</th><th className="px-4 py-3 text-end">Total units</th><th className="px-4 py-3 text-start">Status</th><th className="px-4 py-3 text-end">Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon name="warehouse" /></span><span className="font-medium">{warehouse.name}</span></div></td>
                    <td className="px-4 py-3 text-fg-muted">{warehouse.location || '—'}</td>
                    <td className="px-4 py-3 text-end tabular-nums">{warehouse.product_count}</td>
                    <td className="px-4 py-3 text-end tabular-nums">{Number(warehouse.total_quantity || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${warehouse.is_active ? 'bg-success/10 text-success' : 'bg-muted text-fg-muted'}`}>{warehouse.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => openEdit(warehouse)}><Icon name="pencil" className="size-4" /> Edit</button><button type="button" className="btn btn-secondary" onClick={() => toggleActive(warehouse)}>{warehouse.is_active ? 'Deactivate' : 'Activate'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
