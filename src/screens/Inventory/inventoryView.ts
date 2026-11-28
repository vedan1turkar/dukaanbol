/**
 * Pure view logic for the Inventory screen. No React, no store access —
 * the screen passes data in, so everything here is unit-testable.
 */
import type { Product, Unit } from '../../contracts/types';
import type { LabelKey } from './labels';

// ---------- status ----------

export interface ProductStatus {
  low: boolean;
  /** Soonest expiry among batches inside the warning window (negative = already expired). */
  expiringDays?: number;
  ok: boolean;
}

export function productStatus(
  productId: string,
  lowIds: ReadonlySet<string>,
  expiring: ReadonlyArray<{ product: { id: string }; daysLeft: number }>,
): ProductStatus {
  const low = lowIds.has(productId);
  let expiringDays: number | undefined;
  for (const e of expiring) {
    if (e.product.id !== productId) continue;
    if (expiringDays === undefined || e.daysLeft < expiringDays) expiringDays = e.daysLeft;
  }
  return { low, expiringDays, ok: !low && expiringDays === undefined };
}

// ---------- categories, search, filter ----------

export const ALL = '__all__';

/** Categories that actually exist, sorted, without duplicates or blanks. */
export function categoriesOf(products: ReadonlyArray<Product>): string[] {
  const set = new Set<string>();
  for (const p of products) if (p.category?.trim()) set.add(p.category.trim());
  return [...set].sort((a, b) => a.localeCompare(b));
}

const fold = (s: string) => s.toLowerCase().normalize('NFC').replace(/[\s\-_.]/g, '');

/**
 * Search by name + aliases (Devanagari and Latin) and filter by category.
 * `fuzzySearch` is store.findProducts (handles accents / misspellings);
 * plain substring matching is added so partial typing ("पा", "mag") still works.
 * Empty query → all products in original order.
 */
export function searchAndFilter(
  products: ReadonlyArray<Product>,
  opts: { query: string; category: string; fuzzySearch: (q: string) => Product[] },
): Product[] {
  const inCategory = (p: Product) => opts.category === ALL || p.category === opts.category;
  const q = fold(opts.query.trim());
  if (!q) return products.filter(inCategory);

  const seen = new Set<string>();
  const out: Product[] = [];
  const add = (p: Product) => {
    if (!seen.has(p.id) && inCategory(p)) {
      seen.add(p.id);
      out.push(p);
    }
  };
  for (const p of opts.fuzzySearch(opts.query)) add(p);
  for (const p of products) if ([p.name, ...p.aliases].some((t) => fold(t).includes(q))) add(p);
  return out;
}

// ---------- add-product form ----------

export const UNITS: Unit[] = ['packet', 'kg', 'litre', 'piece', 'box'];

/** Raw form values, exactly as typed. */
export interface AddFormInput {
  name: string;
  unit: string;
  openingQty: string;
  minStock: string;
  category: string;
  costPrice: string;
  sellPrice: string;
  expiryDate: string; // YYYY-MM-DD or ''
  aliases: string; // comma-separated
}

export const EMPTY_FORM: AddFormInput = {
  name: '',
  unit: 'packet',
  openingQty: '',
  minStock: '',
  category: '',
  costPrice: '',
  sellPrice: '',
  expiryDate: '',
  aliases: '',
};

/** Non-user fields the form has to fill in. Listed in the PR description. */
export const ADD_DEFAULTS = { importance: 2 as const };

export type AddFormErrors = Partial<Record<keyof AddFormInput, LabelKey>>;

export type AddFormResult =
  | { ok: true; product: Omit<Product, 'id'>; openingQty: number; expiryDate?: string }
  | { ok: false; errors: AddFormErrors };

const WHOLE = /^\d+$/;
const PRICE = /^\d+(\.\d{1,2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `today` is the local date as YYYY-MM-DD. */
export function validateAddForm(f: AddFormInput, today: string): AddFormResult {
  const errors: AddFormErrors = {};
  const name = f.name.trim();
  if (!name) errors.name = 'errRequired';

  if (!UNITS.includes(f.unit as Unit)) errors.unit = 'errRequired';

  const qty = f.openingQty.trim();
  if (!qty) errors.openingQty = 'errRequired';
  else if (!WHOLE.test(qty)) errors.openingQty = 'errWhole';

  const min = f.minStock.trim();
  if (!min) errors.minStock = 'errRequired';
  else if (!WHOLE.test(min)) errors.minStock = 'errWhole';

  const price = (raw: string, key: 'costPrice' | 'sellPrice') => {
    const v = raw.trim();
    if (!v) return undefined; // optional — never invented
    if (!PRICE.test(v) || Number(v) <= 0) {
      errors[key] = 'errPrice';
      return undefined;
    }
    return Number(v);
  };
  const costPrice = price(f.costPrice, 'costPrice');
  const sellPrice = price(f.sellPrice, 'sellPrice');

  const exp = f.expiryDate.trim();
  if (exp) {
    if (!DATE.test(exp) || Number.isNaN(Date.parse(exp))) errors.expiryDate = 'errDate';
    else if (exp < today) errors.expiryDate = 'errPastDate';
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const aliases = [...new Set(f.aliases.split(',').map((a) => a.trim()).filter(Boolean))];
  const category = f.category.trim() || undefined;

  const product: Omit<Product, 'id'> = {
    name,
    aliases,
    unit: f.unit as Unit,
    minStock: Number(min),
    importance: ADD_DEFAULTS.importance,
    ...(category !== undefined && { category }),
    ...(costPrice !== undefined && { costPrice }),
    ...(sellPrice !== undefined && { sellPrice }),
  };
  return { ok: true, product, openingQty: Number(qty), ...(exp && { expiryDate: exp }) };
}

/** Local (not UTC) date as YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
