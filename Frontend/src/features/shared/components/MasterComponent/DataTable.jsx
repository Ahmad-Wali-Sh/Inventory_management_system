// Table for the "List" tab.
//
// columns: [{ key: 'name', labelKey: 'products.name', render?: (row) => ..., align?: 'end' }]
import { useTranslation } from '../../i18n/useTranslation';
import Icon from '../Icon';

export default function DataTable({ columns, rows, idField, onEdit, onDelete, emptyText }) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return <p className="p-10 text-center text-sm text-fg-muted">{emptyText}</p>;
  }

  const alignClass = (col) => (col.align === 'end' ? 'text-end' : 'text-start');

  return (
    // overflow-x-auto: the table scrolls sideways on small screens
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-fg-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-medium whitespace-nowrap ${alignClass(col)}`}>
                {t(col.labelKey)}
              </th>
            ))}
            <th className="px-4 py-3 text-end font-medium">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[idField]} className="border-t border-line hover:bg-muted/60">
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 whitespace-nowrap ${alignClass(col)}`}>
                  {/* custom render function, or just the value */}
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1">
                  <button
                    className="btn btn-secondary px-2 py-1"
                    onClick={() => onEdit(row)}
                    title={t('common.edit')}
                  >
                    <Icon name="pencil" className="size-4" />
                  </button>
                  <button
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