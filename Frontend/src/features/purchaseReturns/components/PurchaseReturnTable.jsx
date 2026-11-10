// Read-only list of purchase returns; posted inventory documents cannot be edited or deleted.
import { useTranslation } from '../../shared/i18n/useTranslation';

export default function PurchaseReturnTable({ rows, onView }) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return <p className="p-10 text-center text-sm text-fg-muted">{t('master.empty')}</p>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-fg-muted">
          <tr>
            {['returnNo', 'returnDate', 'purchase', 'supplier', 'warehouse', 'amount', 'items'].map((key) => (
              <th key={key} className="whitespace-nowrap px-4 py-3 text-start font-medium">
                {t(`purchaseReturns.${key}`)}
              </th>
            ))}
            <th className="px-4 py-3 text-end font-medium">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line hover:bg-muted/60">
              <td className="whitespace-nowrap px-4 py-3">{row.return_no}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.return_date}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.invoice_no ?? '—'}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.supplier_name}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.warehouse_name}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.total_amount}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.item_count}</td>
              <td className="px-4 py-2 text-end">
                <button type="button" className="btn btn-secondary" onClick={() => onView(row.id)}>
                  {t('purchaseReturns.details')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
