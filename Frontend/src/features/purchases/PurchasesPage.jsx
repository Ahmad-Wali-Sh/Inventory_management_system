import { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '../layout/PageContainer';
import Icon from '../shared/components/Icon';
import { toast } from '../shared/stores/toastStore';
import purchasesApi from './api/purchasesApi';

const today = () => new Date().toISOString().slice(0, 10);
const blankItem = () => ({ productId: '', quantity: '1', unitPrice: '0' });
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [options, setOptions] = useState({ suppliers: [], warehouses: [], products: [] });
  const [form, setForm] = useState({ invoiceNo: '', purchaseDate: today(), supplierId: '', warehouseId: '', discount: '0', notes: '', items: [blankItem()] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [purchaseRows, purchaseOptions] = await Promise.all([purchasesApi.list(), purchasesApi.options()]);
      setPurchases(purchaseRows);
      setOptions(purchaseOptions);
      setForm((current) => ({
        ...current,
        supplierId: current.supplierId || String(purchaseOptions.suppliers[0]?.id || ''),
        warehouseId: current.warehouseId || String(purchaseOptions.warehouses[0]?.id || ''),
      }));
    } catch (requestError) {
      setError(requestError.message || 'Could not load purchases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const subtotal = useMemo(() => form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0), [form.items]);
  const discount = Number(form.discount) || 0;
  const grandTotal = Math.max(0, subtotal - discount);

  const updateItem = (index, patch) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  }));

  const chooseProduct = (index, productId) => {
    const product = options.products.find((item) => String(item.id) === String(productId));
    updateItem(index, { productId, unitPrice: product?.purchase_price ?? '0' });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.supplierId || !form.warehouseId) {
      toast.error('Please add at least one supplier and one active warehouse first.');
      return;
    }
    if (form.items.some((item) => !item.productId || !(Number(item.quantity) > 0) || Number(item.unitPrice) < 0)) {
      toast.error('Select a product and enter a valid quantity and unit cost for every line.');
      return;
    }
    if (discount > subtotal) {
      toast.error('Discount cannot exceed the purchase subtotal.');
      return;
    }
    if (new Set(form.items.map((item) => item.productId)).size !== form.items.length) {
      toast.error('Each product can appear only once. Combine duplicate product lines.');
      return;
    }
    setSaving(true);
    try {
      const created = await purchasesApi.create({
        ...form,
        supplierId: Number(form.supplierId),
        warehouseId: Number(form.warehouseId),
        discount: Number(form.discount || 0),
        items: form.items.map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
      });
      toast.success(`Purchase ${created.invoice_no} saved. Warehouse stock was updated.`);
      setForm({ invoiceNo: '', purchaseDate: today(), supplierId: form.supplierId, warehouseId: form.warehouseId, discount: '0', notes: '', items: [blankItem()] });
      await load();
    } catch (requestError) {
      toast.error(requestError.message || 'Could not save purchase');
    } finally {
      setSaving(false);
    }
  };

  const showDetails = async (id) => {
    try { setSelectedPurchase(await purchasesApi.get(id)); }
    catch (requestError) { toast.error(requestError.message || 'Could not load purchase details'); }
  };

  return (
    <PageContainer title="Purchases">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="card overflow-hidden">
          <div className="border-b border-line p-4"><h2 className="font-semibold">New purchase</h2><p className="mt-1 text-sm text-fg-muted">Save a supplier invoice and increase stock in the selected warehouse.</p></div>
          <form onSubmit={submit} className="space-y-5 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Invoice number (optional)<input className="input mt-1" maxLength={30} value={form.invoiceNo} onChange={(event) => setForm({ ...form, invoiceNo: event.target.value })} placeholder="Auto-generated if empty" /></label>
              <label className="text-sm font-medium">Purchase date<input required type="date" className="input mt-1" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} /></label>
              <label className="text-sm font-medium">Supplier<select required className="input mt-1" value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}><option value="">Select supplier</option>{options.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
              <label className="text-sm font-medium">Warehouse<select required className="input mt-1" value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}><option value="">Select warehouse</option>{options.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Purchase items</h3><button type="button" className="btn btn-secondary" onClick={() => setForm((current) => ({ ...current, items: [...current.items, blankItem()] }))}><Icon name="plus" className="size-4" /> Add item</button></div>
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[minmax(0,1.7fr)_0.7fr_0.8fr_auto]">
                    <label className="text-xs font-medium text-fg-muted">Product<select required className="input mt-1" value={item.productId} onChange={(event) => chooseProduct(index, event.target.value)}><option value="">Select product</option>{options.products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</select></label>
                    <label className="text-xs font-medium text-fg-muted">Quantity<input required min="0.01" step="0.01" type="number" className="input mt-1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} /></label>
                    <label className="text-xs font-medium text-fg-muted">Unit cost<input required min="0" step="0.01" type="number" className="input mt-1" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} /></label>
                    <button type="button" aria-label="Remove item" disabled={form.items.length === 1} className="btn btn-secondary self-end" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><Icon name="trash" className="size-4" /></button>
                    <p className="text-end text-xs text-fg-muted sm:col-span-4">Line total: {money(Number(item.quantity) * Number(item.unitPrice))}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Discount<input min="0" step="0.01" type="number" className="input mt-1" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} /></label>
              <label className="text-sm font-medium">Notes<textarea rows={2} maxLength={1000} className="input mt-1" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm"><div className="flex justify-between"><span className="text-fg-muted">Subtotal</span><span>{money(subtotal)}</span></div><div className="mt-2 flex justify-between"><span className="text-fg-muted">Discount</span><span>{money(discount)}</span></div><div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-semibold"><span>Total</span><span>{money(grandTotal)}</span></div></div>
            <div className="flex justify-end"><button type="submit" className="btn btn-primary" disabled={saving || !options.products.length || !options.suppliers.length || !options.warehouses.length}>{saving ? 'Saving purchase...' : 'Save purchase'}</button></div>
            {(!options.suppliers.length || !options.products.length || !options.warehouses.length) && <p className="text-sm text-danger">Add at least one supplier, product and active warehouse before recording a purchase.</p>}
          </form>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-line p-4"><h2 className="font-semibold">Purchase history</h2><p className="mt-1 text-sm text-fg-muted">Recent supplier invoices.</p></div>
          {loading ? <p className="p-8 text-center text-sm text-fg-muted">Loading purchases...</p> : error ? <div className="p-6 text-center"><p className="mb-3 text-sm text-danger">{error}</p><button className="btn btn-secondary" onClick={load}>Try again</button></div> : purchases.length === 0 ? <p className="p-8 text-center text-sm text-fg-muted">No purchases recorded yet.</p> : (
            <div className="divide-y divide-line">
              {purchases.map((purchase) => <button key={purchase.id} type="button" onClick={() => showDetails(purchase.id)} className="block w-full p-4 text-start transition-colors hover:bg-muted/60"><div className="flex items-center justify-between gap-3"><span className="font-medium">{purchase.invoice_no}</span><span className="font-semibold tabular-nums">{money(purchase.grand_total)}</span></div><p className="mt-1 text-sm text-fg-muted">{purchase.supplier_name} · {purchase.warehouse_name}</p><p className="mt-1 text-xs text-fg-muted">{String(purchase.purchase_date).slice(0, 10)} · {purchase.item_count} item(s)</p></button>)}
            </div>
          )}
        </section>
      </div>

      {selectedPurchase && <div className="card mt-5 overflow-hidden"><div className="flex items-center justify-between border-b border-line p-4"><div><h2 className="font-semibold">{selectedPurchase.invoice_no}</h2><p className="text-sm text-fg-muted">{selectedPurchase.supplier_name} · {selectedPurchase.warehouse_name}</p></div><button type="button" className="btn btn-secondary" onClick={() => setSelectedPurchase(null)}>Close</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="p-3 text-start">Product</th><th className="p-3 text-end">Quantity</th><th className="p-3 text-end">Unit cost</th><th className="p-3 text-end">Total</th></tr></thead><tbody className="divide-y divide-line">{selectedPurchase.items.map((item) => <tr key={item.id}><td className="p-3">{item.product_code} · {item.product_name}</td><td className="p-3 text-end">{item.quantity} {item.unit || ''}</td><td className="p-3 text-end">{money(item.unit_price)}</td><td className="p-3 text-end">{money(item.line_total)}</td></tr>)}</tbody></table></div><div className="p-4 text-end font-semibold">Grand total: {money(selectedPurchase.grand_total)}</div></div>}
    </PageContainer>
  );
}
