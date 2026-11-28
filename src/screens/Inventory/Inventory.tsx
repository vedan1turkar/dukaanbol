import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { store, useStoreVersion } from '../../store';
import AddProductForm from './AddProductForm';
import { ALL, categoriesOf, productStatus, searchAndFilter } from './inventoryView';
import { LABELS, UNIT_LABELS, type Labels } from './labels';

export default function Inventory() {
  useStoreVersion();
  const settings = store.getSettings();
  const t = LABELS[settings.lang];
  const units = UNIT_LABELS[settings.lang];

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [adding, setAdding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(undefined), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  const products = store.listProducts();
  const lowIds = new Set(store.getLowStock().map((x) => x.product.id));
  const expiring = store.getExpiring(settings.expiryWarningDays);
  const categories = categoriesOf(products);
  const shown = searchAndFilter(products, { query, category, fuzzySearch: store.findProducts });
  const filtering = query.trim() !== '' || category !== ALL;

  return (
    <section className="p-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <span className="text-sm text-stone-500">{t.productsCount(products.length)}</span>
      </header>

      {notice && (
        <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">
          {notice}
        </p>
      )}

      {adding ? (
        <div className="mt-4">
          <AddProductForm
            onDone={(id) => {
              setAdding(false);
              if (id) {
                setQuery('');
                setCategory(ALL);
                setNotice(t.added(store.getProduct(id)?.name ?? ''));
              }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 min-h-12 w-full rounded-xl bg-brand text-base font-semibold text-white"
        >
          + {t.addProduct}
        </button>
      )}

      {products.length > 0 && (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className="mt-4 block min-h-11 w-full rounded-lg border border-stone-300 px-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Category">
            {[ALL, ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${category === c ? 'border-brand bg-brand text-white' : 'border-stone-300 bg-white text-stone-700'}`}
              >
                {c === ALL ? t.all : c}
              </button>
            ))}
          </div>
        </>
      )}

      {products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 p-6 text-center">
          <p className="font-medium">{t.noProducts}</p>
          <p className="mt-1 text-sm text-stone-500">{t.noProductsHint}</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-stone-300 p-6 text-center">
          <p className="font-medium">{t.noMatch}</p>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory(ALL);
              }}
              className="mt-3 min-h-11 rounded-lg border border-stone-300 px-4 text-sm"
            >
              {t.clearSearch}
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {shown.map((p) => {
            const s = productStatus(p.id, lowIds, expiring);
            const qty = store.getStock(p.id);
            return (
              <li key={p.id}>
                <Link to={`/product/${p.id}`} className="flex min-h-16 items-center gap-3 px-3 py-3 active:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    {p.category && <p className="truncate text-xs text-stone-500">{p.category}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      <StatusChips status={s} t={t} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xl font-bold tabular-nums ${s.low ? 'text-red-600' : ''}`}>{qty}</p>
                    <p className="text-xs text-stone-500">{units[p.unit]}</p>
                  </div>
                  <span aria-hidden className="text-stone-300">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 border-t border-stone-200 pt-6 text-center">
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="min-h-11 rounded-lg px-4 text-sm text-stone-400 underline underline-offset-4"
        >
          {t.resetDemo}
        </button>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title={t.resetTitle}
          body={t.resetBody}
          confirmLabel={t.resetConfirm}
          cancelLabel={t.cancel}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            store.resetDemo();
            setConfirmReset(false);
            setAdding(false);
            setQuery('');
            setCategory(ALL);
            setNotice(t.resetDone);
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </section>
  );
}

function StatusChips({ status, t }: { status: ReturnType<typeof productStatus>; t: Labels }) {
  const chip = 'rounded-full px-2 py-0.5 text-xs font-medium';
  return (
    <>
      {status.low && <span className={`${chip} bg-red-100 text-red-700`}>{t.low}</span>}
      {status.expiringDays !== undefined && (
        <span className={`${chip} bg-amber-100 text-amber-800`}>{t.expiring(status.expiringDays)}</span>
      )}
      {status.ok && <span className={`${chip} bg-green-100 text-green-700`}>{t.ok}</span>}
    </>
  );
}

function ConfirmDialog(props: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancel = useRef(props.onCancel);
  onCancel.current = props.onCancel;
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={props.onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-body"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reset-title" className="text-lg font-semibold">{props.title}</h2>
        <p id="reset-body" className="mt-2 text-sm text-stone-600">{props.body}</p>
        <div className="mt-5 flex gap-3">
          <button ref={cancelRef} type="button" onClick={props.onCancel} className="min-h-11 flex-1 rounded-lg bg-stone-900 font-semibold text-white">
            {props.cancelLabel}
          </button>
          <button type="button" onClick={props.onConfirm} className="min-h-11 flex-1 rounded-lg border border-red-300 font-medium text-red-700">
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
