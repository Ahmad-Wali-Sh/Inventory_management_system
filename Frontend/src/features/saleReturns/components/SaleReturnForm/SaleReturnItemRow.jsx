// One sale return item with quantity and refund amount fields.
import { Controller } from 'react-hook-form';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { useTranslation } from '../../../shared/i18n/useTranslation';

export default function SaleReturnItemRow({
  control,
  register,
  errors,
  options,
  index,
  linkedSale,
  linkedItems,
  selectedSourceItem,
  remove,
  canRemove,
  setValue,
}) {
  const { t } = useTranslation();
  const blankOption = { value: '', label: '—' };
  const labels = { searchLabel: t('common.search'), noResultsLabel: t('master.noResults') };
  const productOptions = [
    blankOption,
    ...options.products.map((product) => ({
      value: String(product.id),
      label: `${product.code} — ${product.name}`,
    })),
  ];
  const saleItemOptions = [
    blankOption,
    ...linkedItems.map((item) => ({
      value: String(item.sale_item_id),
      label: `${item.product_code} — ${item.product_name} (${t('saleReturns.available')}: ${item.available_quantity})`,
    })),
  ];

  return (
    <div className="grid items-end gap-3 rounded-md border border-line p-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="text-sm font-medium lg:col-span-2">
        {t('saleReturns.product')} *
        <Controller
          control={control}
          name={`items.${index}.${linkedSale ? 'sale_item_id' : 'product_id'}`}
          rules={{ required: t('common.required') }}
          render={({ field }) => (
            <SearchableSelect
              {...labels}
              options={linkedSale ? saleItemOptions : productOptions}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                if (!linkedSale) {
                  const product = options.products.find((item) => item.id === Number(value));
                  setValue(`items.${index}.unit_price`, product?.sale_price ?? '');
                }
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              ariaLabel={t('saleReturns.product')}
            />
          )}
        />
        {errors.items?.[index]?.[linkedSale ? 'sale_item_id' : 'product_id'] && (
          <span className="mt-1 block text-xs text-danger">
            {errors.items[index][linkedSale ? 'sale_item_id' : 'product_id'].message}
          </span>
        )}
      </div>
      <label className="text-sm font-medium">
        {t('saleReturns.quantity')} *
        <input
          type="number"
          min="0.01"
          step="0.01"
          max={linkedSale ? selectedSourceItem?.available_quantity : undefined}
          className="input mt-1"
          {...register(`items.${index}.quantity`, {
            required: t('common.required'),
            min: { value: 0.01, message: t('common.min', { min: 0.01 }) },
            ...(linkedSale && selectedSourceItem ? {
              max: {
                value: Number(selectedSourceItem.available_quantity),
                message: t('common.max', { max: selectedSourceItem.available_quantity }),
              },
            } : {}),
          })}
        />
        {errors.items?.[index]?.quantity && (
          <span className="mt-1 block text-xs text-danger">{errors.items[index].quantity.message}</span>
        )}
      </label>
      <label className="text-sm font-medium">
        {t('saleReturns.unitPrice')}
        {linkedSale ? (
          <p className="input mt-1">{selectedSourceItem?.unit_price ?? '—'}</p>
        ) : (
          <input
            type="number"
            min="0"
            step="0.01"
            className="input mt-1"
            {...register(`items.${index}.unit_price`, {
              required: t('common.required'),
              min: { value: 0, message: t('common.min', { min: 0 }) },
            })}
          />
        )}
        {errors.items?.[index]?.unit_price && (
          <span className="mt-1 block text-xs text-danger">{errors.items[index].unit_price.message}</span>
        )}
      </label>
      <button
        type="button"
        className="btn btn-secondary text-danger"
        onClick={() => remove(index)}
        disabled={!canRemove}
      >
        {t('saleReturns.removeItem')}
      </button>
    </div>
  );
}
