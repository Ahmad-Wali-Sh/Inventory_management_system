// Repeatable list of product lines in a sale return form.
import { useTranslation } from '../../../shared/i18n/useTranslation';
import SaleReturnItemRow from './SaleReturnItemRow';

function emptyItem() {
  return { sale_item_id: '', product_id: '', quantity: '1', unit_price: '' };
}

export default function SaleReturnItems({
  control,
  fields,
  append,
  remove,
  register,
  errors,
  options,
  linkedSale,
  linkedItems,
  watchedItems,
  setValue,
}) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t('saleReturns.items')}</h2>
        <button type="button" className="btn btn-secondary" onClick={() => append(emptyItem())}>
          {t('saleReturns.addItem')}
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => {
          const item = watchedItems[index] || {};
          const selectedSourceItem = linkedItems.find(
            (saleItem) => saleItem.sale_item_id === Number(item.sale_item_id)
          );

          return (
            <SaleReturnItemRow
              key={field.id}
              control={control}
              register={register}
              errors={errors}
              options={options}
              index={index}
              linkedSale={linkedSale}
              linkedItems={linkedItems}
              selectedSourceItem={selectedSourceItem}
              remove={remove}
              canRemove={fields.length > 1}
              setValue={setValue}
            />
          );
        })}
      </div>
    </section>
  );
}
