import { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '../layout/PageContainer';
import Icon from '../shared/components/Icon';
import { toast } from '../shared/stores/toastStore';
import warehousesApi from '../warehouses/api/warehousesApi';
import stockApi from './api/stockApi';

const tabs = [
  { id: 'overview', label: 'Stock overview', icon: 'layers' },
  { id: 'movements', label: 'Movement history', icon: 'activity' },
  { id: 'transfer', label: 'Transfer stock', icon: 'transfer' },
  { id: 'adjustment', label: 'Adjust stock', icon: 'sliders' },
];

const movementLabels = {
  purchase: 'Purchase',
  sale: 'Sale',
  sale_return: 'Sales return',
  purchase_return: 'Purchase return',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  adjustment_in: 'Adjustment in',
  adjustment_out: 'Adjustment out',
};

function Metric({ label, value, hint, icon }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name={icon} className="size-6" /></span>
      <div className="min-w-0"><p className="text-sm text-fg-muted">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>{hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}</div>
    </div>
  );
}

export default function StockPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [movementType, setMovementType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [transfer, setTransfer] = useState({ sourceWarehouseId: '', destinationWarehouseId: '', productId: '', quantity: '', notes: '' });
  const [adjustment, setAdjustment] = useState({ warehouseId: '', productId: '', direction: 'increase', quantity: '', reason: '' });

  const products = useMemo(() => {
    const unique = new Map();
    inventory.forEach((row) => unique.set(row.product_id, { id: row.product_id, name: row.product_name, code: row.code, unit: row.unit }));
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory]);

  const loadData = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      const [nextSummary, nextInventory, nextWarehouses, nextMovements] = await Promise.all([
        stockApi.summary(),
        stockApi.inventory({ warehouseId: warehouseFilter || undefined, search: search || undefined }),
        warehousesApi.list(),
        stockApi.movements({ warehouseId: warehouseFilter || undefined, type: movementType || undefined, limit: 200 }),
      ]);
      setSummary(nextSummary);
      setInventory(nextInventory);
      setWarehouses(nextWarehouses);
      setMovements(nextMovements);
      setTransfer((current) => ({ ...current, sourceWarehouseId: current.sourceWarehouseId || String(nextWarehouses.find((item) => item.is_active)?.id || ''), destinationWarehouseId: current.destinationWarehouseId || String(nextWarehouses.find((item) => item.is_active && String(item.id) !== String(nextWarehouses.find((w) => w.is_active)?.id))?.id || '') }));
      setAdjustment((current) => ({ ...current, warehouseId: current.warehouseId || String(nextWarehouses.find((item) => item.is_active)?.id || '') }));
    } catch (requestError) {
      setError(requestError.message || 'Could not load stock data');
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, movementType, search]);

  useEffect(() => { Promise.resolve().then(loadData); }, [loadData]);

  const submitTransfer = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await stockApi.transfer({
        sourceWarehouseId: Number(transfer.sourceWarehouseId),
        destinationWarehouseId: Number(transfer.destinationWarehouseId),
        items: [{ productId: Number(transfer.productId), quantity: transfer.quantity }],
        notes: transfer.notes,
      });
      toast.success('Stock transferred successfully');
      setTransfer((current) => ({ ...current, productId: '', quantity: '', notes: '' }));
      setActiveTab('movements');
      await loadData();
    } catch (requestError) {
      toast.error(requestError.message || 'Could not transfer stock');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await stockApi.adjust({
        warehouseId: Number(adjustment.warehouseId),
        productId: Number(adjustment.productId),
        direction: adjustment.direction,
        quantity: adjustment.quantity,
        reason: adjustment.reason,
      });
      toast.success('Stock adjustment saved');
      setAdjustment((current) => ({ ...current, productId: '', quantity: '', reason: '' }));
      setActiveTab('movements');
      await loadData();
    } catch (requestError) {
      toast.error(requestError.message || 'Could not adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const activeWarehouses = warehouses.filter((item) => item.is_active);
  const formatNumber = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const formatDate = (value) => new Date(value).toLocaleString();

  return (
    <PageContainer title="Stocks">
      {loading && !summary ? <div className="card p-10 text-center text-sm text-fg-muted">Loading stock information...</div> : error && !summary ? <div className="card p-8 text-center"><p className="mb-3 text-sm text-danger">{error}</p><button className="btn btn-secondary" onClick={loadData}>Try again</button></div> : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Products" value={formatNumber(summary?.product_count)} hint="Products in the catalog" icon="box" />
            <Metric label="Total stock units" value={formatNumber(summary?.total_units)} hint="Across active and inactive warehouses" icon="layers" />
            <Metric label="Estimated stock value" value={formatNumber(summary?.stock_value)} hint="Based on product purchase prices" icon="chart" />
            <Metric label="Low-stock products" value={formatNumber(summary?.low_stock_count)} hint={`${formatNumber(summary?.warehouse_count)} active warehouses`} icon="alert" />
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap gap-1 border-b border-line px-2 pt-2">
              {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 rounded-t-md border-b-2 px-3 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg'}`}><Icon name={tab.icon} className="size-4" />{tab.label}</button>)}
            </div>

            {activeTab === 'overview' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
                  <div><h2 className="font-semibold">Inventory by warehouse</h2><p className="mt-1 text-sm text-fg-muted">Every product is listed separately for each active warehouse.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <input className="input w-52" placeholder="Search product or SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
                    <select className="input w-48" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}><option value="">All warehouses</option>{activeWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead className="bg-muted text-xs uppercase text-fg-muted"><tr><th className="px-4 py-3 text-start">Product</th><th className="px-4 py-3 text-start">Warehouse</th><th className="px-4 py-3 text-end">Available</th><th className="px-4 py-3 text-end">Reorder level</th><th className="px-4 py-3 text-end">Stock value</th><th className="px-4 py-3 text-start">Status</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {inventory.map((row) => {
                        const low = Number(row.total_product_quantity) < Number(row.reorder_level);
                        return <tr key={`${row.product_id}-${row.warehouse_id}`} className="hover:bg-muted/40"><td className="px-4 py-3"><p className="font-medium">{row.product_name}</p><p className="mt-0.5 text-xs text-fg-muted">{row.code} · {row.category_name || 'Uncategorized'}</p></td><td className="px-4 py-3">{row.warehouse_name}</td><td className="px-4 py-3 text-end font-medium tabular-nums">{formatNumber(row.quantity)} <span className="text-xs text-fg-muted">{row.unit}</span></td><td className="px-4 py-3 text-end tabular-nums">{formatNumber(row.reorder_level)}</td><td className="px-4 py-3 text-end tabular-nums">{formatNumber(row.stock_value)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${low ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>{low ? 'Low stock' : 'In stock'}</span></td></tr>;
                      })}
                      {!inventory.length && <tr><td colSpan="6" className="p-8 text-center text-sm text-fg-muted">No inventory records match these filters.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'movements' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4"><div><h2 className="font-semibold">Stock movement ledger</h2><p className="mt-1 text-sm text-fg-muted">Purchases, sales, returns, transfers and manual adjustments.</p></div><div className="flex flex-wrap gap-2"><select className="input w-48" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}><option value="">All warehouses</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="input w-48" value={movementType} onChange={(event) => setMovementType(event.target.value)}><option value="">All movement types</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted text-xs uppercase text-fg-muted"><tr><th className="px-4 py-3 text-start">Date</th><th className="px-4 py-3 text-start">Movement</th><th className="px-4 py-3 text-start">Product</th><th className="px-4 py-3 text-start">Warehouse</th><th className="px-4 py-3 text-start">Reference</th><th className="px-4 py-3 text-end">Quantity change</th></tr></thead><tbody className="divide-y divide-line">{movements.map((row) => <tr key={row.id} className="hover:bg-muted/40"><td className="whitespace-nowrap px-4 py-3 text-fg-muted">{formatDate(row.created_at)}</td><td className="px-4 py-3">{movementLabels[row.movement_type] || row.movement_type}</td><td className="px-4 py-3"><p className="font-medium">{row.product_name}</p><p className="text-xs text-fg-muted">{row.product_code}</p></td><td className="px-4 py-3">{row.warehouse_name}</td><td className="px-4 py-3">{row.reference_no || '—'}</td><td className={`px-4 py-3 text-end font-semibold tabular-nums ${Number(row.quantity_delta) > 0 ? 'text-success' : 'text-danger'}`}>{Number(row.quantity_delta) > 0 ? '+' : ''}{formatNumber(row.quantity_delta)} {row.unit || ''}</td></tr>)}{!movements.length && <tr><td colSpan="6" className="p-8 text-center text-sm text-fg-muted">No stock movements found.</td></tr>}</tbody></table></div>
              </>
            )}

            {activeTab === 'transfer' && (
              <form onSubmit={submitTransfer} className="max-w-3xl p-5">
                <h2 className="font-semibold">Transfer stock between warehouses</h2><p className="mb-5 mt-1 text-sm text-fg-muted">The source balance decreases and the destination balance increases in one database transaction.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">From warehouse<select required className="input mt-1" value={transfer.sourceWarehouseId} onChange={(event) => setTransfer({ ...transfer, sourceWarehouseId: event.target.value })}><option value="">Select source</option>{activeWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="text-sm font-medium">To warehouse<select required className="input mt-1" value={transfer.destinationWarehouseId} onChange={(event) => setTransfer({ ...transfer, destinationWarehouseId: event.target.value })}><option value="">Select destination</option>{activeWarehouses.filter((item) => String(item.id) !== transfer.sourceWarehouseId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="text-sm font-medium md:col-span-2">Product<select required className="input mt-1" value={transfer.productId} onChange={(event) => setTransfer({ ...transfer, productId: event.target.value })}><option value="">Select product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
                  <label className="text-sm font-medium">Quantity<input required min="0.01" step="0.01" type="number" className="input mt-1" value={transfer.quantity} onChange={(event) => setTransfer({ ...transfer, quantity: event.target.value })} /></label>
                  <label className="text-sm font-medium">Notes (optional)<input maxLength={500} className="input mt-1" value={transfer.notes} onChange={(event) => setTransfer({ ...transfer, notes: event.target.value })} placeholder="Reason for transfer" /></label>
                </div>
                <div className="mt-5 flex justify-end"><button type="submit" className="btn btn-primary" disabled={submitting || !activeWarehouses.length || !products.length}>{submitting ? 'Processing...' : 'Confirm transfer'}</button></div>
              </form>
            )}

            {activeTab === 'adjustment' && (
              <form onSubmit={submitAdjustment} className="max-w-3xl p-5">
                <h2 className="font-semibold">Manual stock adjustment</h2><p className="mb-5 mt-1 text-sm text-fg-muted">Use adjustments for verified stock counts, damage or corrections. A reason is required for the audit trail.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">Warehouse<select required className="input mt-1" value={adjustment.warehouseId} onChange={(event) => setAdjustment({ ...adjustment, warehouseId: event.target.value })}><option value="">Select warehouse</option>{activeWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="text-sm font-medium">Product<select required className="input mt-1" value={adjustment.productId} onChange={(event) => setAdjustment({ ...adjustment, productId: event.target.value })}><option value="">Select product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
                  <label className="text-sm font-medium">Adjustment type<select className="input mt-1" value={adjustment.direction} onChange={(event) => setAdjustment({ ...adjustment, direction: event.target.value })}><option value="increase">Increase stock</option><option value="decrease">Decrease stock</option></select></label>
                  <label className="text-sm font-medium">Quantity<input required min="0.01" step="0.01" type="number" className="input mt-1" value={adjustment.quantity} onChange={(event) => setAdjustment({ ...adjustment, quantity: event.target.value })} /></label>
                  <label className="text-sm font-medium md:col-span-2">Reason<textarea required minLength={3} maxLength={500} rows={3} className="input mt-1" value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} placeholder="e.g. Physical count correction or damaged items" /></label>
                </div>
                <div className="mt-5 flex justify-end"><button type="submit" className="btn btn-primary" disabled={submitting || !activeWarehouses.length || !products.length}>{submitting ? 'Saving...' : 'Save adjustment'}</button></div>
              </form>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </>
      )}
    </PageContainer>
  );
}
