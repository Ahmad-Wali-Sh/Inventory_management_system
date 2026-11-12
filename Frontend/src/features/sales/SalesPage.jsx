import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosClient from '../shared/api/axiosClient';
import { useTranslation } from '../shared/i18n/useTranslation';
import { toast } from '../shared/stores/toastStore';

const today = () => { const date = new Date(); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10); };
const money = (value) => Number(value || 0).toFixed(2);

export default function SalesPage() {
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [options, setOptions] = useState({ customers: [], warehouses: [], users: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [userId, setUserId] = useState('');
  const [saleDate, setSaleDate] = useState(today());
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: '1', unit_price: '' }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [salesResponse, optionsResponse] = await Promise.all([
        axiosClient.get('/sales'),
        axiosClient.get('/sales/options'),
      ]);
      setSales(salesResponse.data);
      setOptions(optionsResponse.data);
    } catch (error) {
      toast.error(error.message || 'Could not load sales data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load remote sales data when the page opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((sale) =>
      [sale.invoice_no, sale.customer_name, sale.warehouse_name, sale.username]
        .some((value) => String(value ?? '').toLowerCase().includes(q))
    );
  }, [sales, search]);

  const total = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + quantity * price;
  }, 0);
  const discountValue = Number(discount) || 0;
  const grandTotal = Math.max(0, total - discountValue);

  const productStock = (productId) => {
    const product = options.products.find((p) => String(p.id) === String(productId));
    const stock = product?.stock_by_warehouse?.find((s) => String(s.warehouse_id) === String(warehouseId));
    return Number(stock?.quantity || 0);
  };

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      if (key === 'product_id') {
        const product = options.products.find((p) => String(p.id) === String(value));
        return { ...item, product_id: value, unit_price: product ? String(product.sale_price) : '' };
      }
      return { ...item, [key]: value };
    }));
  };

  const resetForm = () => {
    setCustomerId(''); setWarehouseId(''); setUserId('');
    setSaleDate(today()); setDiscount('0'); setNotes('');
    setItems([{ product_id: '', quantity: '1', unit_price: '' }]);
    setShowForm(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!customerId || !warehouseId || !userId) {
      toast.error(t('sales.requiredSelects'));
      return;
    }
    if (items.some((item) => !item.product_id || Number(item.quantity) <= 0 || Number(item.unit_price) < 0)) {
      toast.error(t('sales.invalidItems'));
      return;
    }
    if (discountValue > total) {
      toast.error(t('sales.discountError'));
      return;
    }
    for (const item of items) {
      if (Number(item.quantity) > productStock(item.product_id)) {
        const product = options.products.find((p) => String(p.id) === String(item.product_id));
        toast.error(`${product?.name || ''}: ${t('sales.stockError')} (${productStock(item.product_id)})`);
        return;
      }
    }
    setSaving(true);
    try {
      await axiosClient.post('/sales', {
        customer_id: Number(customerId),
        warehouse_id: Number(warehouseId),
        user_id: Number(userId),
        sale_date: saleDate,
        discount: discountValue,
        notes,
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });
      toast.success(t('sales.created'));
      resetForm();
      await load();
    } catch (error) {
      toast.error(error.message || t('sales.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const viewSale = async (sale) => {
    setSelectedSale(null);
    setDetailLoading(true);
    try {
      const response = await axiosClient.get(`/sales/${sale.id}`);
      setSelectedSale(response.data);
    } catch (error) {
      toast.error(error.message || 'Could not load invoice details');
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteSale = async (sale) => {
    if (!window.confirm(t('sales.deleteConfirm', { invoice: sale.invoice_no }))) return;
    try {
      await axiosClient.delete(`/sales/${sale.id}`);
      toast.success(t('sales.deleted'));
      await load();
    } catch (error) {
      toast.error(error.message || t('sales.deleteError'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('sales.title')}</h1>
          <p className="mt-1 text-sm text-fg-muted">{t('sales.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>
          {showForm ? t('sales.closeForm') : `+ ${t('sales.newSale')}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card space-y-5 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t('sales.newSale')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('sales.customer')} *</span>
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">{t('sales.selectCustomer')}</option>
                {options.customers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` — ${item.phone}` : ''}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('sales.warehouse')} *</span>
              <select className="input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
                <option value="">{t('sales.selectWarehouse')}</option>
                {options.warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('sales.soldBy')} *</span>
              <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">{t('sales.selectUser')}</option>
                {options.users.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('sales.date')}</span>
              <input className="input" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{t('sales.items')}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setItems((old) => [...old, { product_id: '', quantity: '1', unit_price: '' }])}>
                + {t('sales.addItem')}
              </button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-12">
                <label className="block text-sm sm:col-span-5">
                  <span className="mb-1 block font-medium">{t('sales.product')}</span>
                  <select className="input" value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} required>
                    <option value="">{t('sales.selectProduct')}</option>
                    {options.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.code} — {product.name}
                      </option>
                    ))}
                  </select>
                  {item.product_id && warehouseId && <span className="mt-1 block text-xs text-fg-muted">{t('sales.available')}: {productStock(item.product_id)}</span>}
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">{t('sales.quantity')}</span>
                  <input className="input" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">{t('sales.unitPrice')}</span>
                  <input className="input" type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} required />
                </label>
                <div className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">{t('sales.lineTotal')}</span>
                  <div className="rounded-lg bg-surface-muted px-3 py-2">{money(Number(item.quantity) * Number(item.unit_price))}</div>
                </div>
                <button type="button" className="btn btn-secondary sm:col-span-1" disabled={items.length === 1} onClick={() => setItems((old) => old.filter((_, i) => i !== index))} aria-label={t('sales.removeItem')}>×</button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('sales.discount')}</span>
              <input className="input" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('sales.notes')}</span>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
            <div className="flex flex-wrap gap-5 text-sm">
              <span>{t('sales.subtotal')}: <strong>{money(total)}</strong></span>
              <span>{t('sales.discount')}: <strong>{money(discountValue)}</strong></span>
              <span className="text-lg">{t('sales.grandTotal')}: <strong>{money(grandTotal)}</strong></span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.loading') : t('sales.saveSale')}</button>
            </div>
          </div>
        </form>
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h2 className="font-semibold">{t('sales.history')}</h2>
          <input className="input w-full sm:max-w-xs" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? <p className="p-8 text-center text-sm text-fg-muted">{t('common.loading')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-surface-muted text-start">
                <tr>
                  {[t('sales.invoice'), t('sales.date'), t('sales.customer'), t('sales.warehouse'), t('sales.items'), t('sales.total'), t('common.actions')].map((label) => <th key={label} className="px-4 py-3 text-start font-semibold">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{sale.invoice_no}</td>
                    <td className="px-4 py-3">{String(sale.sale_date).slice(0, 10)}</td>
                    <td className="px-4 py-3">{sale.customer_name}</td>
                    <td className="px-4 py-3">{sale.warehouse_name}</td>
                    <td className="px-4 py-3">{sale.item_count}</td>
                    <td className="px-4 py-3 font-semibold">{money(sale.grand_total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="btn btn-secondary" onClick={() => viewSale(sale)}>{t('sales.view')}</button>
                        <button className="btn btn-secondary" onClick={() => deleteSale(sale)}>{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredSales.length && <tr><td colSpan="7" className="px-4 py-10 text-center text-fg-muted">{t('sales.noSales')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(selectedSale || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={() => !detailLoading && setSelectedSale(null)}>
          <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5" role="dialog" aria-modal="true" aria-label={t('sales.invoiceDetails')} onClick={(event) => event.stopPropagation()}>
            {detailLoading ? <p className="p-8 text-center">{t('common.loading')}</p> : selectedSale && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{t('sales.invoiceDetails')}</h2>
                    <p className="text-sm text-fg-muted">{selectedSale.invoice_no}</p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>{t('common.cancel')}</button>
                </div>
                <div className="grid gap-3 rounded-xl bg-surface-muted p-4 sm:grid-cols-2">
                  <p>{t('sales.customer')}: <strong>{selectedSale.customer_name}</strong></p>
                  <p>{t('sales.warehouse')}: <strong>{selectedSale.warehouse_name}</strong></p>
                  <p>{t('sales.soldBy')}: <strong>{selectedSale.username}</strong></p>
                  <p>{t('sales.date')}: <strong>{String(selectedSale.sale_date).slice(0, 10)}</strong></p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-line text-start">
                      {[t('sales.product'), t('sales.quantity'), t('sales.unitPrice'), t('sales.lineTotal')].map((label) => <th key={label} className="px-3 py-2 text-start">{label}</th>)}
                    </tr></thead>
                    <tbody>{selectedSale.items.map((item) => (
                      <tr key={item.id} className="border-b border-line">
                        <td className="px-3 py-2">{item.product_name} <span className="text-fg-muted">({item.code})</span></td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{money(item.unit_price)}</td>
                        <td className="px-3 py-2">{money(item.line_total)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="ms-auto max-w-xs space-y-2 border-t border-line pt-3 text-sm">
                  <p className="flex justify-between"><span>{t('sales.subtotal')}</span><strong>{money(selectedSale.total_amount)}</strong></p>
                  <p className="flex justify-between"><span>{t('sales.discount')}</span><strong>{money(selectedSale.discount)}</strong></p>
                  <p className="flex justify-between text-lg"><span>{t('sales.grandTotal')}</span><strong>{money(selectedSale.grand_total)}</strong></p>
                </div>
                {selectedSale.notes && <p className="text-sm text-fg-muted">{t('sales.notes')}: {selectedSale.notes}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
