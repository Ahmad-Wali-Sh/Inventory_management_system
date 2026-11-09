// MasterComponent: a complete CRUD screen for ANY model.
// It has three tabs: List, New, Edit.
//
// You only describe your model in a config object:
//
//   const productConfig = {
//     endpoint: '/products',          // API path (after VITE_API_URL)
//     idField: 'id',                  // primary key (default 'id')
//     nameField: 'name',              // shown in the delete question
//     searchKeys: ['code', 'name'],   // columns the search box looks in
//     columns: [...],                 // table columns  (see DataTable.jsx)
//     fields: [...],                  // form inputs    (see MasterForm.jsx)
//   };
//
//   <MasterComponent config={productConfig} />
//
// See features/products/products.config.js for a full example.
import { useMemo, useState } from 'react';
import { useCrud } from '../../hooks/useCrud';
import { useTranslation } from '../../i18n/useTranslation';
import { toast } from '../../stores/toastStore';
import ConfirmModal from '../ConfirmModal';
import Icon from '../Icon';
import DataTable from './DataTable';
import MasterForm from './MasterForm';

const TABS = { LIST: 'list', NEW: 'new', EDIT: 'edit' };

/** Values for an empty "New" form: each field's defaultValue, or ''. */
function emptyValues(fields) {
  return Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? '']));
}

/** Values for the "Edit" form: take the row's values (null becomes ''). */
function rowValues(fields, row) {
  return Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? '']));
}

/** One tab button. Kept outside MasterComponent so React does not recreate it. */
function TabButton({ active, label, icon, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors
        disabled:cursor-not-allowed disabled:opacity-40
        ${active ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg'}`}
    >
      <Icon name={icon} className="size-4" />
      {label}
    </button>
  );
}

export default function MasterComponent({ config }) {
  const { endpoint, columns, fields, idField = 'id', nameField = 'name', searchKeys } = config;
  const { t } = useTranslation();
  const { rows, loading, error, reload, create, update, remove } = useCrud(endpoint, idField);

  const [tab, setTab] = useState(TABS.LIST);
  const [editingRow, setEditingRow] = useState(null);  // row in the Edit tab
  const [deleteTarget, setDeleteTarget] = useState(null); // row waiting for "are you sure?"
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  // ---------- Search (client side) ----------
  // useMemo: only filter again when rows or search text change.
  const visibleRows = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return rows;
    const keys = searchKeys || columns.map((c) => c.key);
    return rows.filter((row) => keys.some((key) => String(row[key] ?? '').toLowerCase().includes(text)));
  }, [rows, search, searchKeys, columns]);

  // ---------- Actions ----------
  const openEdit = (row) => {
    setEditingRow(row);
    setTab(TABS.EDIT);
  };

  const backToList = () => {
    setEditingRow(null);
    setTab(TABS.LIST);
  };

  // Shared by New and Edit: show "saving", call the API, show a toast.
  const save = async (action, successMessage) => {
    setSaving(true);
    try {
      await action();
      toast.success(successMessage);
      backToList();
    } catch (err) {
      toast.error(err.message); // e.g. "duplicate key value ..." from the API
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = (values) => save(() => create(values), t('master.created'));
  const handleUpdate = (values) => save(() => update(editingRow[idField], values), t('master.updated'));

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove(deleteTarget[idField]);
      toast.success(t('master.deleted'));
      if (editingRow?.[idField] === deleteTarget[idField]) backToList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ---------- List tab body ----------
  const renderList = () => {
    if (loading) return <p className="p-10 text-center text-sm text-fg-muted">{t('common.loading')}</p>;

    if (error) {
      return (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button className="btn btn-secondary" onClick={reload}>
            {t('common.retry')}
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-fg-muted">
              <Icon name="search" className="size-4" />
            </span>
            <input
              className="input ps-9"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-sm text-fg-muted">{t('master.count', { count: visibleRows.length })}</span>
        </div>
        <DataTable
          columns={columns}
          rows={visibleRows}
          idField={idField}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          emptyText={search ? t('master.noResults') : t('master.empty')}
        />
      </>
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-line px-2">
        <TabButton active={tab === TABS.LIST} onClick={() => setTab(TABS.LIST)} label={t('master.list')} icon="layers" />
        <TabButton active={tab === TABS.NEW} onClick={() => setTab(TABS.NEW)} label={t('master.new')} icon="plus" />
        <TabButton
          active={tab === TABS.EDIT}
          onClick={() => setTab(TABS.EDIT)}
          label={t('master.edit')}
          icon="pencil"
          disabled={!editingRow}
        />
      </div>

      {/* Tab content */}
      {tab === TABS.LIST && renderList()}

      {tab === TABS.NEW && (
        <MasterForm
          key="new"
          fields={fields}
          initialValues={emptyValues(fields)}
          onSubmit={handleCreate}
          onCancel={backToList}
          saving={saving}
        />
      )}

      {tab === TABS.EDIT && editingRow && (
        <MasterForm
          key={editingRow[idField]} // new key = fresh form for another row
          fields={fields}
          initialValues={rowValues(fields, editingRow)}
          onSubmit={handleUpdate}
          onCancel={backToList}
          saving={saving}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('master.deleteTitle')}
        message={t('master.deleteConfirm', { name: deleteTarget?.[nameField] ?? deleteTarget?.[idField] })}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}