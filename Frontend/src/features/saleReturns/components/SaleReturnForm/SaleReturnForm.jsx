// Form for creating a linked or free-standing sale return.
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from '../../../shared/i18n/useTranslation';
import SaleReturnFields from './SaleReturnFields';
import SaleReturnItems from './SaleReturnItems';

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyItem() {
  return { sale_item_id: '', product_id: '', quantity: '1', unit_price: '' };
}

export default function SaleReturnForm({ options, saving, initialValues, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues || {
      return_no: '',
      return_date: localDate(),
      sale_id: '',
      customer_id: '',
      warehouse_id: '',
      user_id: options.users[0]?.id ?? '',
      reason: '',
      items: [{ sale_item_id: '', product_id: '', quantity: '1', unit_price: '' }],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });
  const saleId = useWatch({ control, name: 'sale_id' });
  const watchedItems = useWatch({ control, name: 'items' }) || [];
  const selectedSale = options.sales.find((sale) => sale.id === Number(saleId));
  const linkedItems = options.saleItems.filter(
    (item) => {
      if (item.sale_id !== Number(saleId)) return false;
      const currentReturnQuantity = initialValues?.sale_id === Number(saleId)
        ? initialValues.items
          .filter((returnItem) => (
            returnItem.product_id === item.product_id
            && String(returnItem.unit_price) === String(item.unit_price)
          ))
          .reduce((total, returnItem) => total + Number(returnItem.quantity), 0)
        : 0;
      return Number(item.available_quantity) + currentReturnQuantity > 0;
    }
  );

  const changeSale = (value) => {
    replace([emptyItem()]);
    if (value) {
      const sale = options.sales.find((item) => item.id === Number(value));
      setValue('customer_id', sale.customer_id);
      setValue('warehouse_id', sale.warehouse_id);
    } else {
      setValue('customer_id', '');
      setValue('warehouse_id', '');
    }
  };

  const submit = (values) => {
    const linked = Boolean(values.sale_id);
    onSubmit({
      return_no: values.return_no.trim(),
      return_date: values.return_date,
      sale_id: linked ? Number(values.sale_id) : null,
      customer_id: linked ? undefined : Number(values.customer_id),
      warehouse_id: linked ? undefined : Number(values.warehouse_id),
      user_id: Number(values.user_id),
      reason: values.reason.trim(),
      items: values.items.map((item) => linked
        ? { sale_item_id: Number(item.sale_item_id), quantity: item.quantity }
        : {
          product_id: Number(item.product_id),
          quantity: item.quantity,
          unit_price: item.unit_price,
        }),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="card space-y-5 p-4 sm:p-6" noValidate>
      <SaleReturnFields
        control={control}
        register={register}
        errors={errors}
        options={options}
        selectedSale={selectedSale}
        onSaleChange={changeSale}
      />
      <SaleReturnItems
        control={control}
        fields={fields}
        append={append}
        remove={remove}
        register={register}
        errors={errors}
        options={options}
        linkedSale={Boolean(saleId)}
        linkedItems={linkedItems}
        watchedItems={watchedItems}
        setValue={setValue}
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </form>
  );
}
