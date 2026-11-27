/**
 * Demo shop data. Owner: Vedant.
 * Demo story: Maggi is low (18), a Parle-G batch expires in 5 days.
 * Dates are generated relative to "today" so the demo always looks fresh.
 */
import type { Batch, LedgerEntry, Product, ShopSettings, Supplier } from '../contracts/types';

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: '',
  lang: 'mr',
  dailyBudget: 3000,
  expiryWarningDays: 7,
  confidence: { high: 0.75, low: 0.4 },
  onboarded: false,
};

export const SUPPLIERS: Supplier[] = [
  { id: 's-sharma', name: 'Sharma Distributors', leadTimeDays: 1 },
  { id: 's-patil', name: 'Patil Traders', leadTimeDays: 2 },
  { id: 's-amul', name: 'Amul Milk Agency', leadTimeDays: 1 },
];

export const PRODUCTS: Product[] = [
  { id: 'p-parleg', name: 'Parle-G', aliases: ['पार्ले जी', 'पारले जी', 'पार्ले', 'parle g', 'parle ji', 'parleg', 'पारले'], unit: 'packet', category: 'Biscuits', minStock: 30, costPrice: 9, sellPrice: 10, supplierId: 's-sharma', importance: 3 },
  { id: 'p-maggi', name: 'Maggi', aliases: ['मॅगी', 'मैगी', 'मॅगि', 'maggie', 'magi', 'maggi noodles'], unit: 'packet', category: 'Noodles', minStock: 24, costPrice: 13, sellPrice: 15, supplierId: 's-sharma', importance: 3 },
  { id: 'p-amulmilk', name: 'Amul Milk', aliases: ['अमूल दूध', 'अमूल', 'अमुल', 'amul doodh', 'amul dudh', 'milk', 'दूध'], unit: 'packet', category: 'Dairy', minStock: 20, costPrice: 27, sellPrice: 30, supplierId: 's-amul', importance: 3 },
  { id: 'p-tatasalt', name: 'Tata Salt', aliases: ['टाटा मीठ', 'टाटा नमक', 'मीठ', 'नमक', 'tata namak', 'salt'], unit: 'packet', category: 'Staples', minStock: 10, costPrice: 25, sellPrice: 28, supplierId: 's-patil', importance: 2 },
  { id: 'p-goodday', name: 'Good Day', aliases: ['गुड डे', 'good day', 'goodday'], unit: 'packet', category: 'Biscuits', minStock: 12, costPrice: 18, sellPrice: 20, supplierId: 's-sharma', importance: 1 },
  { id: 'p-surf', name: 'Surf Excel', aliases: ['सर्फ', 'सर्फ एक्सेल', 'surf', 'surf excel'], unit: 'packet', category: 'Detergent', minStock: 6, costPrice: 95, sellPrice: 110, supplierId: 's-patil', importance: 2 },
  { id: 'p-fortune', name: 'Fortune Oil', aliases: ['फॉर्च्युन', 'फॉर्च्यून तेल', 'तेल', 'fortune', 'oil'], unit: 'litre', category: 'Staples', minStock: 8, costPrice: 140, sellPrice: 155, supplierId: 's-patil', importance: 3 },
  { id: 'p-sugar', name: 'Sugar', aliases: ['साखर', 'चीनी', 'shakkar', 'sakhar', 'cheeni'], unit: 'kg', category: 'Staples', minStock: 10, costPrice: 42, sellPrice: 46, supplierId: 's-patil', importance: 3 },
  { id: 'p-colgate', name: 'Colgate', aliases: ['कोलगेट', 'colgate', 'toothpaste'], unit: 'piece', category: 'Personal care', minStock: 6, costPrice: 48, sellPrice: 55, supplierId: 's-sharma', importance: 1 },
  { id: 'p-lux', name: 'Lux Soap', aliases: ['लक्स', 'साबण', 'साबुन', 'lux', 'soap'], unit: 'piece', category: 'Personal care', minStock: 10, costPrice: 32, sellPrice: 38, supplierId: 's-sharma', importance: 1 },
  { id: 'p-bread', name: 'Bread', aliases: ['ब्रेड', 'पाव', 'bread', 'pav'], unit: 'packet', category: 'Bakery', minStock: 8, costPrice: 35, sellPrice: 40, supplierId: 's-amul', importance: 2 },
  { id: 'p-tea', name: 'Tata Tea', aliases: ['टाटा चहा', 'चहा', 'चाय', 'tata tea', 'chai', 'chaha'], unit: 'packet', category: 'Beverages', minStock: 6, costPrice: 120, sellPrice: 135, supplierId: 's-patil', importance: 2 },
];

/** Current stock per product for the demo. */
const OPENING: Record<string, number> = {
  'p-parleg': 40, 'p-maggi': 18, 'p-amulmilk': 22, 'p-tatasalt': 9, 'p-goodday': 25,
  'p-surf': 10, 'p-fortune': 7, 'p-sugar': 30, 'p-colgate': 12, 'p-lux': 20, 'p-bread': 10, 'p-tea': 8,
};

/** Rough average daily sales, used to generate 14 days of history. */
const DAILY_SALES: Record<string, number> = {
  'p-parleg': 8, 'p-maggi': 6, 'p-amulmilk': 10, 'p-tatasalt': 2, 'p-goodday': 2,
  'p-surf': 1, 'p-fortune': 2, 'p-sugar': 4, 'p-colgate': 1, 'p-lux': 2, 'p-bread': 4, 'p-tea': 1,
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export function buildSeed(now: Date = new Date()) {
  const batches: Batch[] = [];
  const ledger: LedgerEntry[] = [];
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;

  for (const p of PRODUCTS) {
    const daily = DAILY_SALES[p.id] ?? 1;
    const opening = OPENING[p.id] ?? 0;
    // Arrival 14 days ago big enough to cover 14 days of sales + today's stock
    const arrivedQty = opening + daily * 14;
    const start = addDays(now, -14);
    ledger.push({ id: id('l'), type: 'arrival', productId: p.id, qtyDelta: arrivedQty, at: start.toISOString(), source: 'manual', supplierId: p.supplierId, note: 'Opening stock' });
    for (let day = 13; day >= 1; day--) {
      // deterministic wobble so the chart isn't flat
      const qty = Math.max(0, daily + ((day * 7 + p.id.length) % 3) - 1);
      ledger.push({ id: id('l'), type: 'sale', productId: p.id, qtyDelta: -qty, at: addDays(now, -day).toISOString(), source: 'manual' });
    }
  }

  // Reconcile so current stock equals OPENING exactly.
  for (const p of PRODUCTS) {
    const sum = ledger.filter((e) => e.productId === p.id).reduce((s, e) => s + e.qtyDelta, 0);
    const diff = (OPENING[p.id] ?? 0) - sum;
    if (diff !== 0) {
      ledger.push({ id: id('l'), type: 'sale', productId: p.id, qtyDelta: diff, at: addDays(now, -1).toISOString(), source: 'manual' });
    }
  }

  // Batches with expiry (only for perishables / where it applies)
  batches.push(
    { id: 'b-parleg-1', productId: 'p-parleg', qty: 12, expiryDate: isoDate(addDays(now, 5)), batchNo: 'PG-1123', receivedAt: addDays(now, -14).toISOString() },
    { id: 'b-parleg-2', productId: 'p-parleg', qty: 28, expiryDate: isoDate(addDays(now, 120)), batchNo: 'PG-1201', receivedAt: addDays(now, -14).toISOString() },
    { id: 'b-maggi-1', productId: 'p-maggi', qty: 18, expiryDate: isoDate(addDays(now, 90)), receivedAt: addDays(now, -14).toISOString() },
    { id: 'b-milk-1', productId: 'p-amulmilk', qty: 22, expiryDate: isoDate(addDays(now, 2)), receivedAt: addDays(now, -1).toISOString() },
    { id: 'b-bread-1', productId: 'p-bread', qty: 10, expiryDate: isoDate(addDays(now, 3)), receivedAt: addDays(now, -1).toISOString() },
  );

  return { products: PRODUCTS, suppliers: SUPPLIERS, batches, ledger };
}
