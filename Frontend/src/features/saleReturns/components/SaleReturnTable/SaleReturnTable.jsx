// Read-only list of sale returns.
import { useTranslation } from '../../../shared/i18n/useTranslation';
import Icon from '../../../shared/components/Icon';

export default function SaleReturnTable({ rows, onView, onEdit, onDelete }) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return <p className="p-10 text-center text-sm text-fg-muted">{t('master.empty')}</p>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-fg-muted">
          <tr>
            {['returnNo', 'returnDate', 'sale', 'customer', 'warehouse', 'amount', 'items'].map((key) => (
              <th key={key} className="whitespace-nowrap px-4 py-3 text-start font-medium">
                {t(`saleReturns.${key}`)}
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
              <td className="whitespace-nowrap px-4 py-3">{row.customer_name}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.warehouse_name}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.total_amount}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.item_count}</td>
              <td className="px-4 py-2 text-end">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className="btn btn-secondary px-2 py-1"
                    onClick={() => onView(row.id)}
                    title={t('saleReturns.details')}
                  >
                    {t('saleReturns.details')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary px-2 py-1"
                    onClick={() => onEdit(row)}
                    title={t('common.edit')}
                  >
                    <Icon name="pencil" className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary px-2 py-1 text-danger"
                    onClick={() => onDelete(row)}
                    title={t('common.delete')}
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
