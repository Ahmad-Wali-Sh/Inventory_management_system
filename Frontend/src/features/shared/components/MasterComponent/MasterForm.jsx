// Form for the "New" and "Edit" tabs, built from the `fields` config
// with react-hook-form.
//
// fields: [{
//   name: 'code',                 // column name sent to the API
//   labelKey: 'products.code',    // translation key for the label
//   type: 'text' | 'number' | 'textarea' | 'select' | 'password' | 'email' | 'date',
//   required: true,               // shows "This field is required"
//   min: 0,                       // for numbers
//   step: '0.01',                 // for numbers
//   options: [{ value: 'admin', labelKey: 'roles.admin' }],  // for select
//   defaultValue: 0,              // value in the "New" form
//   fullWidth: true,              // take the whole row
//   rules: { ... },               // any extra react-hook-form rules
// }]
import { useForm } from 'react-hook-form';
import { useTranslation } from '../../i18n/useTranslation';

/** Build react-hook-form validation rules from a field config. */
function buildRules(field, t) {
  const rules = { ...field.rules };
  if (field.required) rules.required = t('common.required');
  if (field.min !== undefined) rules.min = { value: field.min, message: t('common.min', { min: field.min }) };
  return rules;
}

/**
 * Form inputs give us strings. Turn number fields into numbers.
 * An empty number field becomes `undefined`, so it is NOT sent and the
 * database default (e.g. price = 0) is used.
 */
function cleanValues(fields, values) {
  const result = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === 'number') {
      result[field.name] = value === '' || value === null ? undefined : Number(value);
    } else {
      result[field.name] = value;
    }
  }
  return result;
}

export default function MasterForm({ fields, initialValues, onSubmit, onCancel, saving, submitLabel }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: initialValues });

  // Note: MasterComponent gives this form a `key` (the row id). When the key
  // changes, React builds a fresh form, so the new row's values are loaded.

  const submit = (values) => onSubmit(cleanValues(fields, values));

  // One input, chosen by field.type
  const renderInput = (field) => {
    const props = { id: field.name, className: 'input', ...register(field.name, buildRules(field, t)) };

    if (field.type === 'textarea') return <textarea rows={3} {...props} />;

    if (field.type === 'select') {
      return (
        <select {...props}>
          <option value="">—</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.labelKey ? t(opt.labelKey) : opt.label}
            </option>
          ))}
        </select>
      );
    }

    return <input type={field.type || 'text'} step={field.step} {...props} />;
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="p-4 sm:p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={field.fullWidth || field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label htmlFor={field.name} className="mb-1 block text-sm font-medium">
              {t(field.labelKey)}
              {field.required && <span className="text-danger"> *</span>}
            </label>
            {renderInput(field)}
            {errors[field.name] && (
              <p className="mt-1 text-xs text-danger">{errors[field.name].message}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t('common.loading') : submitLabel || t('common.save')}
        </button>
      </div>
    </form>
  );
}