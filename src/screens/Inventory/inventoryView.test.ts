import { describe, expect, it } from 'vitest';
import { createLocalStore } from '../../store/localStore';
import {
  ALL,
  categoriesOf,
  EMPTY_FORM,
  localToday,
  productStatus,
  searchAndFilter,
  validateAddForm,
  type AddFormInput,
} from './inventoryView';

const NOW = new Date('2026-11-28T10:00:00Z');
const store = createLocalStore({ storage: null, now: () => NOW });
const lowIds = new Set(store.getLowStock().map((x) => x.product.id));
const expiring = store.getExpiring(store.getSettings().expiryWarningDays);
const status = (id: string) => productStatus(id, lowIds, expiring);
const products = store.listProducts();
const search = (query: string, category = ALL) =>
  searchAndFilter(products, { query, category, fuzzySearch: store.findProducts }).map((p) => p.id);

describe('productStatus (seed data)', () => {
  it('Maggi (stock 18) is Low', () => {
    expect(store.getStock('p-maggi')).toBe(18);
    expect(status('p-maggi')).toMatchObject({ low: true, ok: false });
  });

  it('Parle-G is Expiring in 5 days, not Low', () => {
    expect(status('p-parleg')).toEqual({ low: false, expiringDays: 5, ok: false });
  });

  it('Amul Milk is Expiring in 2 days', () => {
    expect(status('p-amulmilk').expiringDays).toBe(2);
  });

  it('Sugar is OK', () => {
    expect(status('p-sugar')).toEqual({ low: false, expiringDays: undefined, ok: true });
  });

  it('a product can be both Low and Expiring; soonest batch wins', () => {
    const s = productStatus('x', new Set(['x']), [
      { product: { id: 'x' }, daysLeft: 6 },
      { product: { id: 'x' }, daysLeft: 1 },
    ]);
    expect(s).toEqual({ low: true, expiringDays: 1, ok: false });
  });
});

describe('categories, search and filter', () => {
  it('lists only categories that exist, sorted, no duplicates', () => {
    const cats = categoriesOf(products);
    expect(cats).toContain('Biscuits');
    expect(new Set(cats).size).toBe(cats.length);
    expect([...cats].sort((a, b) => a.localeCompare(b))).toEqual(cats);
  });

  it('empty query returns all products', () => {
    expect(search('')).toHaveLength(products.length);
  });

  it('Devanagari alias "पारले" finds Parle-G', () => {
    expect(search('पारले')[0]).toBe('p-parleg');
  });

  it('partial typing still matches ("mag" → Maggi)', () => {
    expect(search('mag')).toContain('p-maggi');
  });

  it('category filter and search combine', () => {
    expect(search('', 'Biscuits').sort()).toEqual(['p-goodday', 'p-parleg']);
    expect(search('parle', 'Biscuits')).toEqual(['p-parleg']);
    expect(search('parle', 'Dairy')).toEqual([]);
    expect(search('टाटा', 'Staples')).toEqual(['p-tatasalt']);
  });

  it('unknown query returns nothing', () => {
    expect(search('xyzzy')).toEqual([]);
  });
});

describe('validateAddForm', () => {
  const today = '2026-11-28';
  const valid: AddFormInput = { ...EMPTY_FORM, name: ' Kurkure ', openingQty: '12', minStock: '5' };

  it('accepts minimal input and never invents optional data', () => {
    const r = validateAddForm(valid, today);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.product.name).toBe('Kurkure');
    expect(r.openingQty).toBe(12);
    expect(r.product.costPrice).toBeUndefined();
    expect(r.product.sellPrice).toBeUndefined();
    expect(r.product.category).toBeUndefined();
    expect(r.expiryDate).toBeUndefined();
    expect(r.product.aliases).toEqual([]);
  });

  it('parses comma-separated aliases and optional fields', () => {
    const r = validateAddForm(
      { ...valid, aliases: 'कुरकुरे, kurkure ,, कुरकुरे', costPrice: '9', sellPrice: '10.50', category: 'Snacks', expiryDate: '2026-12-31' },
      today,
    );
    expect(r.ok && r.product.aliases).toEqual(['कुरकुरे', 'kurkure']);
    expect(r.ok && r.product.sellPrice).toBe(10.5);
    expect(r.ok && r.expiryDate).toBe('2026-12-31');
  });

  it('requires name, opening qty and min stock', () => {
    const r = validateAddForm(EMPTY_FORM, today);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toMatchObject({ name: 'errRequired', openingQty: 'errRequired', minStock: 'errRequired' });
  });

  it('rejects negative or fractional quantities', () => {
    for (const bad of ['-3', '2.5', 'abc']) {
      const r = validateAddForm({ ...valid, openingQty: bad, minStock: bad }, today);
      expect(!r.ok && r.errors.openingQty).toBe('errWhole');
      expect(!r.ok && r.errors.minStock).toBe('errWhole');
    }
  });

  it('accepts zero opening stock', () => {
    expect(validateAddForm({ ...valid, openingQty: '0', minStock: '0' }, today).ok).toBe(true);
  });

  it('rejects zero or negative prices', () => {
    const r = validateAddForm({ ...valid, costPrice: '0', sellPrice: '-5' }, today);
    expect(!r.ok && r.errors).toMatchObject({ costPrice: 'errPrice', sellPrice: 'errPrice' });
  });

  it('rejects a past expiry date, accepts today', () => {
    const past = validateAddForm({ ...valid, expiryDate: '2026-11-27' }, today);
    expect(!past.ok && past.errors.expiryDate).toBe('errPastDate');
    expect(validateAddForm({ ...valid, expiryDate: today }, today).ok).toBe(true);
  });

  it('rejects an unknown unit', () => {
    const r = validateAddForm({ ...valid, unit: 'dozen' }, today);
    expect(!r.ok && r.errors.unit).toBe('errRequired');
  });

  it('localToday uses the local calendar date', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
