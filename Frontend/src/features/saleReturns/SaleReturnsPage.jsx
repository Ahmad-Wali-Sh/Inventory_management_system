// Sale return list, detail and creation screen.
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../layout/PageContainer';
import Icon from '../shared/components/Icon';
import ConfirmModal from '../shared/components/ConfirmModal';
import { useTranslation } from '../shared/i18n/useTranslation';
import { toast } from '../shared/stores/toastStore';
import { saleReturnsApi } from './api/saleReturnsApi';
import SaleReturnDetails from './components/SaleReturnDetails/SaleReturnDetails';
import SaleReturnForm from './components/SaleReturnForm/SaleReturnForm';
import SaleReturnTable from './components/SaleReturnTable/SaleReturnTable';

function fetchSaleReturnPageData() {
  return Promise.all([saleReturnsApi.list(), saleReturnsApi.getOptions()]);
}

export default function SaleReturnsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [returnRows, lookupOptions] = await fetchSaleReturnPageData();
      setRows(returnRows);
      setOptions(lookupOptions);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchSaleReturnPageData()
      .then(([returnRows, lookupOptions]) => {
        if (active) {
          setRows(returnRows);
          setOptions(lookupOptions);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedReturnId) return undefined;
    let active = true;
    saleReturnsApi.get(selectedReturnId)
      .then((result) => {
        if (active) setSelectedReturn(result);
      })
      .catch((requestError) => {
        if (active) {
          toast.error(requestError.message);
          setSelectedReturnId(null);
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedReturnId]);

  const reloadData = () => {
    setLoading(true);
    setError(null);
    loadData();
  };

  const openDetails = (id) => {
    setSelectedReturn(null);
    setDetailLoading(true);
    setSelectedReturnId(id);
  };

  const toFormValues = (saleReturn, lookupOptions) => ({
    id: saleReturn.id,
    return_no: saleReturn.return_no,
    return_date: String(saleReturn.return_date).slice(0, 10),
    sale_id: saleReturn.sale_id ?? '',
    customer_id: saleReturn.customer_id,
    warehouse_id: saleReturn.warehouse_id,
    user_id: saleReturn.user_id,
    reason: saleReturn.reason ?? '',
    items: saleReturn.items.map((item) => ({
      sale_item_id: saleReturn.sale_id
        ? lookupOptions.saleItems.find((saleItem) => (
          saleItem.sale_id === saleReturn.sale_id
          && saleItem.product_id === item.product_id
          && String(saleItem.unit_price) === String(item.unit_price)
        ))?.sale_item_id ?? ''
        : '',
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  });

  const openEdit = async (row) => {
    setEditLoading(true);
    try {
      const saleReturn = await saleReturnsApi.get(row.id);
      setEditingReturn(toFormValues(saleReturn, options));
      setSelectedReturnId(null);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setEditLoading(false);
    }
  };

  const createSaleReturn = async (data) => {
    setSaving(true);
    try {
      await saleReturnsApi.create(data);
      toast.success(t('saleReturns.saved'));
      setFormOpen(false);
      setLoading(true);
      setError(null);
      await loadData();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSaleReturn = async (data) => {
    setSaving(true);
    try {
      await saleReturnsApi.update(editingReturn.id, data);
      toast.success(t('saleReturns.updated'));
      setEditingReturn(null);
      setLoading(true);
      setError(null);
      await loadData();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await saleReturnsApi.remove(deleteTarget.id);
      toast.success(t('master.deleted'));
      setDeleteTarget(null);
      setLoading(true);
      setError(null);
      await loadData();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  const actions = selectedReturnId || editingReturn || editLoading ? null : (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => setFormOpen((open) => !open)}
      disabled={!options}
    >
      {formOpen ? t('common.cancel') : t('saleReturns.new')}
    </button>
  );
  const query = search.trim().toLowerCase();
  const visibleRows = rows.filter((row) => !query || [
    row.return_no,
    row.invoice_no,
    row.customer_name,
    row.warehouse_name,
    row.reason,
  ].some((value) => String(value ?? '').toLowerCase().includes(query)));

  return (
    <PageContainer title={t('saleReturns.title')} actions={actions}>
      {loading && <p className="card p-10 text-center text-sm text-fg-muted">{t('common.loading')}</p>}

      {!loading && error && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={reloadData}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && !error && selectedReturnId && detailLoading && (
        <p className="card p-10 text-center text-sm text-fg-muted">{t('common.loading')}</p>
      )}
      {!loading && !error && selectedReturnId && selectedReturn && (
        <SaleReturnDetails
          saleReturn={selectedReturn}
          onBack={() => {
            setSelectedReturnId(null);
            setDetailLoading(false);
          }}
        />
      )}
      {!loading && !error && !selectedReturnId && formOpen && options && (
        <SaleReturnForm
          options={options}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSubmit={createSaleReturn}
        />
      )}
      {!loading && !error && !selectedReturnId && !formOpen && editLoading && (
        <p className="card p-10 text-center text-sm text-fg-muted">{t('common.loading')}</p>
      )}
      {!loading && !error && !selectedReturnId && editingReturn && options && (
        <SaleReturnForm
          key={editingReturn.id}
          options={options}
          initialValues={editingReturn}
          saving={saving}
          onCancel={() => setEditingReturn(null)}
          onSubmit={saveSaleReturn}
        />
      )}
      {!loading && !error && !selectedReturnId && !formOpen && !editingReturn && !editLoading && (
        <>
          <div className="card mb-4 p-4">
            <div className="relative w-full sm:max-w-sm">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-fg-muted">
                <Icon name="search" className="size-4" />
              </span>
              <input
                className="input ps-9"
                placeholder={t('common.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <SaleReturnTable
            rows={visibleRows}
            onView={openDetails}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title={t('master.deleteTitle')}
        message={t('master.deleteConfirm', { name: deleteTarget?.return_no })}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
