// Return header fields and sale/customer/warehouse selectors.
import { Controller } from 'react-hook-form';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { useTranslation } from '../../../shared/i18n/useTranslation';

export default function SaleReturnFields({ control, register, errors, options, selectedSale, onSaleChange }) {
  const { t } = useTranslation();
  const blankOption = { value: '', label: '—' };
  const labels = { searchLabel: t('common.search'), noResultsLabel: t('master.noResults') };
  const selectOptions = {
    sales: [
      { ...blankOption, label: t('saleReturns.freeReturn') },
      ...options.sales.map((sale) => ({
        value: String(sale.id),
        label: `${sale.invoice_no} — ${sale.customer_name}`,
      })),
    ],
    customers: [
      blankOption,
      ...options.customers.map((customer) => ({ value: String(customer.id), label: customer.name })),
    ],
    warehouses: [
      blankOption,
      ...options.warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name })),
    ],
    users: [
      blankOption,
      ...options.users.map((user) => ({ value: String(user.id), label: user.username })),
    ],
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium">
        {t('saleReturns.returnNo')} *
        <input className="input mt-1" {...register('return_no', { required: t('common.required') })} />
        {errors.return_no && <span className="mt-1 block text-xs text-danger">{errors.return_no.message}</span>}
      </label>
      <label className="text-sm font-medium">
        {t('saleReturns.returnDate')} *
        <input type="date" className="input mt-1" {...register('return_date', { required: t('common.required') })} />
        {errors.return_date && <span className="mt-1 block text-xs text-danger">{errors.return_date.message}</span>}
      </label>
      <div className="text-sm font-medium">
        {t('saleReturns.sale')}
        <Controller
          control={control}
          name="sale_id"
          render={({ field }) => (
            <SearchableSelect
              {...labels}
              options={selectOptions.sales}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                onSaleChange(value);
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              ariaLabel={t('saleReturns.sale')}
            />
          )}
        />
      </div>
      {selectedSale ? (
        <>
          <div className="text-sm">
            <span className="font-medium">{t('saleReturns.customer')}</span>
            <p className="input mt-1">{selectedSale.customer_name}</p>
          </div>
          <div className="text-sm">
            <span className="font-medium">{t('saleReturns.warehouse')}</span>
            <p className="input mt-1">{selectedSale.warehouse_name}</p>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium">
            {t('saleReturns.customer')} *
            <Controller
              control={control}
              name="customer_id"
              rules={{ required: t('common.required') }}
              render={({ field }) => (
                <SearchableSelect
                  {...labels}
                  options={selectOptions.customers}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  ariaLabel={t('saleReturns.customer')}
                />
              )}
            />
            {errors.customer_id && <span className="mt-1 block text-xs text-danger">{errors.customer_id.message}</span>}
          </div>
          <div className="text-sm font-medium">
            {t('saleReturns.warehouse')} *
            <Controller
              control={control}
              name="warehouse_id"
              rules={{ required: t('common.required') }}
              render={({ field }) => (
                <SearchableSelect
                  {...labels}
                  options={selectOptions.warehouses}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  ariaLabel={t('saleReturns.warehouse')}
                />
              )}
            />
            {errors.warehouse_id && <span className="mt-1 block text-xs text-danger">{errors.warehouse_id.message}</span>}
          </div>
        </>
      )}
      <div className="text-sm font-medium">
        {t('saleReturns.createdBy')} *
        <Controller
          control={control}
          name="user_id"
          rules={{ required: t('common.required') }}
          render={({ field }) => (
            <SearchableSelect
              {...labels}
              options={selectOptions.users}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              ariaLabel={t('saleReturns.createdBy')}
            />
          )}
        />
        {errors.user_id && <span className="mt-1 block text-xs text-danger">{errors.user_id.message}</span>}
      </div>
      <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">
        {t('saleReturns.reason')}
        <textarea rows={2} className="input mt-1" {...register('reason')} />
      </label>
    </div>
  );
}
