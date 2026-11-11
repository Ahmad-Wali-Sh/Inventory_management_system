// Purchase return list, detail and creation screen.
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../layout/PageContainer';
import Icon from '../shared/components/Icon';
import { toast } from '../shared/stores/toastStore';
import { useTranslation } from '../shared/i18n/useTranslation';
import { purchaseReturnsApi } from './api/purchaseReturnsApi';
import PurchaseReturnDetails from './components/PurchaseReturnDetails';
import PurchaseReturnForm from './components/PurchaseReturnForm';
import PurchaseReturnTable from './components/PurchaseReturnTable';

function fetchPurchaseReturnPageData() {
  return Promise.all([
    purchaseReturnsApi.list(),
    purchaseReturnsApi.getOptions(),
  ]);
}

export default function PurchaseReturnsPage() {
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
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [returnRows, lookupOptions] = await fetchPurchaseReturnPageData();
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
    fetchPurchaseReturnPageData()
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
    purchaseReturnsApi.get(selectedReturnId)
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

  const loadDataAgain = () => {
    setLoading(true);
    setError(null);
    loadData();
  };

  const openDetails = (id) => {
    setSelectedReturn(null);
    setDetailLoading(true);
    setSelectedReturnId(id);
  };

  const createPurchaseReturn = async (data) => {
    setSaving(true);
    try {
      await purchaseReturnsApi.create(data);
      toast.success(t('purchaseReturns.saved'));
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

  const actions = selectedReturnId ? null : (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => setFormOpen((open) => !open)}
      disabled={!options}
    >
      {formOpen ? t('common.cancel') : t('purchaseReturns.new')}
    </button>
  );
  const visibleRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    return !query || [
      row.return_no,
      row.invoice_no,
      row.supplier_name,
      row.warehouse_name,
      row.reason,
    ].some((value) => String(value ?? '').toLowerCase().includes(query));
  });

  return (
    <PageContainer title={t('purchaseReturns.title')} actions={actions}>
      {loading && <p className="card p-10 text-center text-sm text-fg-muted">{t('common.loading')}</p>}

      {!loading && error && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={loadDataAgain}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && !error && selectedReturnId && detailLoading && (
        <p className="card p-10 text-center text-sm text-fg-muted">{t('common.loading')}</p>
      )}
      {!loading && !error && selectedReturnId && selectedReturn && (
        <PurchaseReturnDetails
          purchaseReturn={selectedReturn}
          onBack={() => {
            setSelectedReturnId(null);
            setDetailLoading(false);
          }}
        />
      )}
      {!loading && !error && !selectedReturnId && formOpen && options && (
        <PurchaseReturnForm
          options={options}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSubmit={createPurchaseReturn}
        />
      )}
      {!loading && !error && !selectedReturnId && !formOpen && (
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
          <PurchaseReturnTable rows={visibleRows} onView={openDetails} />
        </>
      )}
    </PageContainer>
  );
}
