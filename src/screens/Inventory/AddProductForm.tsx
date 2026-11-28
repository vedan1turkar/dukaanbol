/**
 * Manual add-product form. Reusable: the voice flow ("unknown product → add it?")
 * can render it with `initialName` set to what the shopkeeper said.
 */
import { useId, useState, type ReactNode } from 'react';
import { store, useStoreVersion } from '../../store';
import {
  categoriesOf,
  EMPTY_FORM,
  localToday,
  UNITS,
  validateAddForm,
  type AddFormErrors,
  type AddFormInput,
} from './inventoryView';
import { LABELS, UNIT_LABELS } from './labels';

export interface AddProductFormProps {
  initialName?: string;
  /** Called with the new product id on success, or undefined if the user cancelled. */
  onDone: (productId?: string) => void;
}

const inputCls =
  'mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

export default function AddProductForm({ initialName = '', onDone }: AddProductFormProps) {
  useStoreVersion();
  const lang = store.getSettings().lang;
  const t = LABELS[lang];
  const units = UNIT_LABELS[lang];
  const today = localToday();
  const listId = useId();

  const [form, setForm] = useState<AddFormInput>({ ...EMPTY_FORM, name: initialName });
  const [errors, setErrors] = useState<AddFormErrors>({});
  const [storeError, setStoreError] = useState<string>();

  const set = (k: keyof AddFormInput) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
    setStoreError(undefined);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateAddForm(form, today);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    const r = store.addProduct(v.product, v.openingQty, v.expiryDate);
    if (!r.ok) {
      setStoreError(r.reason);
      return;
    }
    onDone(r.value.id);
  }

  const field = (k: keyof AddFormInput, label: string, input: ReactNode, opts: { optional?: boolean; hint?: string } = {}) => (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {opts.optional && <span className="ml-1 font-normal text-stone-400">({t.optional})</span>}
      </span>
      {input}
      {errors[k] ? (
        <span className="mt-1 block text-sm text-red-600">{t[errors[k]!]}</span>
      ) : (
        opts.hint && <span className="mt-1 block text-xs text-stone-500">{opts.hint}</span>
      )}
    </label>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h2 className="text-lg font-semibold">{t.addProduct}</h2>

      {field('name', t.name, <input className={inputCls} value={form.name} onChange={set('name')} autoFocus={!initialName} />)}

      <fieldset>
        <legend className="text-sm font-medium text-stone-700">{t.unit}</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => set('unit')({ target: { value: u } })}
              aria-pressed={form.unit === u}
              className={`min-h-11 rounded-lg border px-3 text-sm ${form.unit === u ? 'border-brand bg-brand-light font-semibold text-brand-dark' : 'border-stone-300 bg-white'}`}
            >
              {units[u]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        {field('openingQty', t.openingQty, <input className={inputCls} inputMode="numeric" value={form.openingQty} onChange={set('openingQty')} />)}
        {field('minStock', t.minStock, <input className={inputCls} inputMode="numeric" value={form.minStock} onChange={set('minStock')} />, { hint: t.minStockHint })}
      </div>

      {field(
        'category',
        t.category,
        <>
          <input className={inputCls} list={listId} value={form.category} onChange={set('category')} />
          <datalist id={listId}>
            {categoriesOf(store.listProducts()).map((c) => <option key={c} value={c} />)}
          </datalist>
        </>,
        { optional: true },
      )}

      <div className="grid grid-cols-2 gap-3">
        {field('costPrice', t.costPrice, <input className={inputCls} inputMode="decimal" value={form.costPrice} onChange={set('costPrice')} />, { optional: true })}
        {field('sellPrice', t.sellPrice, <input className={inputCls} inputMode="decimal" value={form.sellPrice} onChange={set('sellPrice')} />, { optional: true })}
      </div>

      {field('expiryDate', t.expiryDate, <input className={inputCls} type="date" min={today} value={form.expiryDate} onChange={set('expiryDate')} />, { optional: true })}

      {field('aliases', t.aliases, <input className={inputCls} value={form.aliases} onChange={set('aliases')} />, { optional: true, hint: t.aliasesHint })}

      {storeError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {storeError}
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => onDone(undefined)} className="min-h-11 flex-1 rounded-lg border border-stone-300 bg-white font-medium">
          {t.cancel}
        </button>
        <button type="submit" className="min-h-11 flex-1 rounded-lg bg-brand font-semibold text-white">
          {t.save}
        </button>
      </div>
    </form>
  );
}
