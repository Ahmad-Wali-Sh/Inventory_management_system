// A simple "Are you sure?" dialog.
//
// <ConfirmModal
//   open={isOpen}
//   title="Delete record"
//   message="Are you sure?"
//   confirmLabel="Delete"
//   loading={isDeleting}
//   onConfirm={handleDelete}
//   onCancel={() => setIsOpen(false)}
// />
import { useTranslation } from '../i18n/useTranslation';

export default function ConfirmModal({ open, title, message, confirmLabel, loading, onConfirm, onCancel }) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      {/* stopPropagation: clicking inside the box should not close it */}
      <div
        role="dialog"
        aria-modal="true"
        className="card w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-fg-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? t('common.loading') : confirmLabel || t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}