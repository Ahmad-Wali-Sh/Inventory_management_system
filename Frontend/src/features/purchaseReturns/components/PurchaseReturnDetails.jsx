// Read-only details for a saved purchase return.
import { useTranslation } from '../../shared/i18n/useTranslation';

export default function PurchaseReturnDetails({ purchaseReturn, onBack }) {
  const { t } = useTranslation();

  return (
    <section className="card space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{purchaseReturn.return_no}</h2>
          <p className="text-sm text-fg-muted">
            {purchaseReturn.return_date} · {purchaseReturn.supplier_name} · {purchaseReturn.warehouse_name}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t('common.back')}
        </button>
      </div>
      {purchaseReturn.reason && <p className="text-sm">{purchaseReturn.reason}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('purchaseReturns.product')}</th>
              <th className="px-4 py-3 text-end font-medium">{t('purchaseReturns.quantity')}</th>
              <th className="px-4 py-3 text-end font-medium">{t('purchaseReturns.unitPrice')}</th>
              <th className="px-4 py-3 text-end font-medium">{t('purchaseReturns.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {purchaseReturn.items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.product_code} — {item.product_name}</td>
                <td className="px-4 py-3 text-end">{item.quantity}</td>
                <td className="px-4 py-3 text-end">{item.unit_price}</td>
                <td className="px-4 py-3 text-end">{item.line_total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line font-semibold">
              <td className="px-4 py-3" colSpan={3}>{t('purchaseReturns.amount')}</td>
              <td className="px-4 py-3 text-end">{purchaseReturn.total_amount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
