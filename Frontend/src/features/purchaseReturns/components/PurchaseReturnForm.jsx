// Form for creating a purchase return, including its stock-returning items.
import { useId, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from '../../shared/i18n/useTranslation';

function SearchableSelect({ options, value, onChange, onBlur, inputRef, ariaLabel, searchLabel, noResultsLabel }) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedOption = options.find((option) => String(option.value) === String(value));
  const filteredOptions = options.filter((option) => (
    (!query || option.value !== '') && option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  ));

  const chooseOption = (option) => {
    onChange(option.value);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative mt-1">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        className="input"
        placeholder={isOpen ? searchLabel : '—'}
        value={isOpen ? query : selectedOption?.label ?? ''}
        onFocus={() => {
          setQuery('');
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onBlur={() => {
          setQuery('');
          setIsOpen(false);
          setActiveIndex(-1);
          onBlur();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setQuery('');
            setIsOpen(false);
            setActiveIndex(-1);
          } else if (event.key === 'ArrowDown' && isOpen) {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
          } else if (event.key === 'ArrowUp' && isOpen) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && isOpen) {
            event.preventDefault();
            const option = filteredOptions[activeIndex];
            if (option) chooseOption(option);
          }
        }}
      />
      {isOpen && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {filteredOptions.length > 0 ? filteredOptions.map((option) => (
            <button
              key={option.value}
              id={`${listId}-${filteredOptions.indexOf(option)}`}
              type="button"
              role="option"
              aria-selected={String(option.value) === String(value)}
              className={`block w-full px-3 py-2 text-start text-sm text-fg hover:bg-muted ${
                filteredOptions.indexOf(option) === activeIndex ? 'bg-muted' : ''
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-fg-muted">{noResultsLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

function emptyItem() {
  return { purchase_item_id: '', product_id: '', quantity: '1', unit_price: '' };
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function PurchaseReturnForm({ options, saving, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      return_no: '',
      return_date: localDate(),
      purchase_id: '',
      supplier_id: '',
      warehouse_id: '',
      user_id: options.users[0]?.id ?? '',
      reason: '',
      items: [emptyItem()],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });
  const purchaseId = useWatch({ control, name: 'purchase_id' });
  const warehouseId = useWatch({ control, name: 'warehouse_id' });
  const watchedItems = useWatch({ control, name: 'items' }) || [];
  const selectedPurchase = options.purchases.find((purchase) => purchase.id === Number(purchaseId));
  const linkedItems = options.purchaseItems.filter(
    (item) => item.purchase_id === Number(purchaseId) && Number(item.available_quantity) > 0
  );
  const warehouseStocks = options.stocks.filter((stock) => stock.warehouse_id === Number(warehouseId));
  const blankOption = { value: '', label: '—' };
  const purchaseOptions = [
    blankOption,
    ...options.purchases.map((purchase) => ({
      value: String(purchase.id),
      label: `${purchase.invoice_no} — ${purchase.supplier_name}`,
    })),
  ];
  const supplierOptions = [
    blankOption,
    ...options.suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
  ];
  const warehouseOptions = [
    blankOption,
    ...options.warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name })),
  ];
  const userOptions = [
    blankOption,
    ...options.users.map((user) => ({ value: String(user.id), label: user.username })),
  ];
  const searchSelectLabels = {
    search: t('common.search'),
    noResults: t('common.noResults'),
  };

  const changePurchase = (value) => {
    replace([emptyItem()]);
    if (value) {
      const purchase = options.purchases.find((item) => item.id === Number(value));
      setValue('supplier_id', purchase.supplier_id);
      setValue('warehouse_id', purchase.warehouse_id);
    } else {
      setValue('supplier_id', '');
      setValue('warehouse_id', '');
    }
  };

  const submit = (values) => {
    const linked = Boolean(values.purchase_id);
    onSubmit({
      return_no: values.return_no.trim(),
      return_date: values.return_date,
      purchase_id: linked ? Number(values.purchase_id) : null,
      supplier_id: linked ? undefined : Number(values.supplier_id),
      warehouse_id: linked ? undefined : Number(values.warehouse_id),
      user_id: Number(values.user_id),
      reason: values.reason.trim(),
      items: values.items.map((item) => linked
        ? {
          purchase_item_id: Number(item.purchase_item_id),
          quantity: item.quantity,
        }
        : {
          product_id: Number(item.product_id),
          quantity: item.quantity,
          unit_price: item.unit_price,
        }),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="card space-y-5 p-4 sm:p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium">
          {t('purchaseReturns.returnNo')} *
          <input className="input mt-1" {...register('return_no', { required: t('common.required') })} />
          {errors.return_no && <span className="mt-1 block text-xs text-danger">{errors.return_no.message}</span>}
        </label>
        <label className="text-sm font-medium">
          {t('purchaseReturns.returnDate')} *
          <input type="date" className="input mt-1" {...register('return_date', { required: t('common.required') })} />
          {errors.return_date && <span className="mt-1 block text-xs text-danger">{errors.return_date.message}</span>}
        </label>
        <div className="text-sm font-medium">
          {t('purchaseReturns.purchase')}
          <Controller
            control={control}
            name="purchase_id"
            render={({ field }) => (
              <SearchableSelect
                {...searchSelectLabels}
                options={[{ ...blankOption, label: t('purchaseReturns.freeReturn') }, ...purchaseOptions.slice(1)]}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  changePurchase(value);
                }}
                onBlur={field.onBlur}
                inputRef={field.ref}
                ariaLabel={t('purchaseReturns.purchase')}
              />
            )}
          />
        </div>
        {selectedPurchase ? (
          <>
            <div className="text-sm">
              <span className="font-medium">{t('purchaseReturns.supplier')}</span>
              <p className="input mt-1">{selectedPurchase.supplier_name}</p>
            </div>
            <div className="text-sm">
              <span className="font-medium">{t('purchaseReturns.warehouse')}</span>
              <p className="input mt-1">{selectedPurchase.warehouse_name}</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium">
              {t('purchaseReturns.supplier')} *
              <Controller
                control={control}
                name="supplier_id"
                rules={{ required: t('common.required') }}
                render={({ field }) => (
                  <SearchableSelect
                    {...searchSelectLabels}
                    options={supplierOptions}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    ariaLabel={t('purchaseReturns.supplier')}
                  />
                )}
              />
              {errors.supplier_id && <span className="mt-1 block text-xs text-danger">{errors.supplier_id.message}</span>}
            </div>
            <div className="text-sm font-medium">
              {t('purchaseReturns.warehouse')} *
              <Controller
                control={control}
                name="warehouse_id"
                rules={{ required: t('common.required') }}
                render={({ field }) => (
                  <SearchableSelect
                    {...searchSelectLabels}
                    options={warehouseOptions}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    ariaLabel={t('purchaseReturns.warehouse')}
                  />
                )}
              />
              {errors.warehouse_id && <span className="mt-1 block text-xs text-danger">{errors.warehouse_id.message}</span>}
            </div>
          </>
        )}
        <div className="text-sm font-medium">
          {t('purchaseReturns.createdBy')} *
          <Controller
            control={control}
            name="user_id"
            rules={{ required: t('common.required') }}
            render={({ field }) => (
              <SearchableSelect
                {...searchSelectLabels}
                options={userOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                ariaLabel={t('purchaseReturns.createdBy')}
              />
            )}
          />
          {errors.user_id && <span className="mt-1 block text-xs text-danger">{errors.user_id.message}</span>}
        </div>
        <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">
          {t('purchaseReturns.reason')}
          <textarea rows={2} className="input mt-1" {...register('reason')} />
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t('purchaseReturns.items')}</h2>
          <button type="button" className="btn btn-secondary" onClick={() => append(emptyItem())}>
            {t('purchaseReturns.addItem')}
          </button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => {
            const selectedSourceItem = linkedItems.find(
              (item) => item.purchase_item_id === Number(watchedItems[index]?.purchase_item_id)
            );
            const selectedProduct = options.products.find(
              (product) => product.id === Number(watchedItems[index]?.product_id)
            );
            const availableStock = warehouseStocks.find(
              (stock) => stock.product_id === Number(watchedItems[index]?.product_id)
            );
            const purchaseItemOptions = [
              blankOption,
              ...linkedItems.map((item) => ({
                value: String(item.purchase_item_id),
                label: `${item.product_code} — ${item.product_name} (${t('purchaseReturns.available')}: ${item.available_quantity})`,
              })),
            ];
            const productOptions = [
              blankOption,
              ...options.products.filter((product) => {
                const stock = warehouseStocks.find((item) => item.product_id === product.id);
                return Number(stock?.quantity ?? 0) > 0;
              }).map((product) => ({
                value: String(product.id),
                label: `${product.code} — ${product.name}`,
              })),
            ];

            return (
              <div key={field.id} className="grid items-end gap-3 rounded-md border border-line p-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="text-sm font-medium lg:col-span-2">
                  {t('purchaseReturns.product')} *
                  {purchaseId ? (
                    <Controller
                      control={control}
                      name={`items.${index}.purchase_item_id`}
                      rules={{ required: t('common.required') }}
                      render={({ field: controllerField }) => (
                        <SearchableSelect
                          {...searchSelectLabels}
                          options={purchaseItemOptions}
                          value={controllerField.value}
                          onChange={controllerField.onChange}
                          onBlur={controllerField.onBlur}
                          inputRef={controllerField.ref}
                          ariaLabel={t('purchaseReturns.product')}
                        />
                      )}
                    />
                  ) : (
                    <Controller
                      control={control}
                      name={`items.${index}.product_id`}
                      rules={{ required: t('common.required') }}
                      render={({ field: controllerField }) => (
                        <SearchableSelect
                          {...searchSelectLabels}
                          options={productOptions}
                          value={controllerField.value}
                          onChange={(value) => {
                            controllerField.onChange(value);
                            const product = options.products.find((item) => item.id === Number(value));
                            setValue(`items.${index}.unit_price`, product?.purchase_price ?? '');
                          }}
                          onBlur={controllerField.onBlur}
                          inputRef={controllerField.ref}
                          ariaLabel={t('purchaseReturns.product')}
                        />
                      )}
                    />
                  )}
                  {errors.items?.[index]?.[purchaseId ? 'purchase_item_id' : 'product_id'] && (
                    <span className="mt-1 block text-xs text-danger">
                      {errors.items[index][purchaseId ? 'purchase_item_id' : 'product_id'].message}
                    </span>
                  )}
                </div>
                <label className="text-sm font-medium">
                  {t('purchaseReturns.quantity')} *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={purchaseId ? selectedSourceItem?.available_quantity : availableStock?.quantity}
                    className="input mt-1"
                    {...register(`items.${index}.quantity`, {
                      required: t('common.required'),
                      min: { value: 0.01, message: t('common.min', { min: 0.01 }) },
                    })}
                  />
                  {errors.items?.[index]?.quantity && (
                    <span className="mt-1 block text-xs text-danger">{errors.items[index].quantity.message}</span>
                  )}
                </label>
                <label className="text-sm font-medium">
                  {t('purchaseReturns.unitPrice')}
                  {purchaseId ? (
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
                  disabled={fields.length === 1}
                >
                  {t('purchaseReturns.removeItem')}
                </button>
                {selectedProduct && !purchaseId && (
                  <p className="text-xs text-fg-muted sm:col-span-2 lg:col-span-5">
                    {t('purchaseReturns.available')}: {availableStock?.quantity ?? 0}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
