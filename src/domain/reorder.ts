/**
 * Reorder recommendations. Deterministic.
 *
 * With enough history:  target = max(minStock, ceil(avgDaily × (leadTime + coverDays)))
 *                       reorder if stock ≤ minStock OR days-of-stock-left ≤ leadTime + 2
 * With limited history: reorder if stock ≤ minStock, suggest 2 × minStock − stock  (flag limitedData)
 * Perishables (Dairy, Bakery) use a short cover so we don't over-buy.
 */
import type { Lang, LedgerEntry, Product, Recommendation, Supplier } from '../contracts/types';
import { demandOf } from './demand';
import { stockOf } from './ledger';

export const DEFAULT_COVER_DAYS = 7;
export const PERISHABLE_COVER_DAYS = 2;
export const DEFAULT_LEAD_DAYS = 2;
const PERISHABLE = new Set(['Dairy', 'Bakery']);

export function leadTimeOf(p: Product, suppliers: Supplier[]): number {
  return p.leadTimeDays ?? suppliers.find((s) => s.id === p.supplierId)?.leadTimeDays ?? DEFAULT_LEAD_DAYS;
}

export function recommend(args: {
  products: Product[];
  suppliers: Supplier[];
  ledger: LedgerEntry[];
  now: Date;
  lang: Lang;
  coverDays?: number;
}): Recommendation[] {
  const { products, suppliers, ledger, now, lang } = args;
  const out: Recommendation[] = [];

  for (const p of products) {
    const stock = stockOf(ledger, p.id);
    const d = demandOf(ledger, p.id, now);
    const lead = leadTimeOf(p, suppliers);
    const cover = PERISHABLE.has(p.category ?? '') ? PERISHABLE_COVER_DAYS : args.coverDays ?? DEFAULT_COVER_DAYS;

    let suggestedQty = 0;
    let daysLeft = Infinity;
    if (d.limitedData) {
      if (stock <= p.minStock) suggestedQty = 2 * p.minStock - stock;
    } else {
      daysLeft = d.avgDaily > 0 ? stock / d.avgDaily : Infinity;
      const needs = stock <= p.minStock || daysLeft <= lead + 2;
      if (needs) {
        const target = Math.max(p.minStock, Math.ceil(d.avgDaily * (lead + cover)));
        suggestedQty = Math.max(target - stock, 1);
      }
    }
    if (suggestedQty <= 0) continue;

    const urgency =
      p.importance * 10 +
      (Number.isFinite(daysLeft) ? Math.max(0, 10 - daysLeft) : 0) +
      (stock <= p.minStock ? 5 : 0) +
      (stock <= 0 ? 20 : 0);

    out.push({
      productId: p.id,
      currentQty: stock,
      suggestedQty,
      estimatedCost: p.costPrice !== undefined ? round2(p.costPrice * suggestedQty) : undefined,
      supplierId: p.supplierId,
      reason: reasonText(lang, { stock, minStock: p.minStock, daysLeft, avgDaily: d.avgDaily, limited: d.limitedData }),
      urgency: Math.round(urgency * 10) / 10,
      limitedData: d.limitedData,
    });
  }
  return out.sort((a, b) => b.urgency - a.urgency || a.productId.localeCompare(b.productId));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

function reasonText(
  lang: Lang,
  x: { stock: number; minStock: number; daysLeft: number; avgDaily: number; limited: boolean },
): string {
  const days = Number.isFinite(x.daysLeft) ? Math.max(0, Math.floor(x.daysLeft)) : undefined;
  const perDay = Math.round(x.avgDaily * 10) / 10;
  if (x.limited) {
    return {
      mr: `Stock ${x.stock}, minimum ${x.minStock} (विक्रीचा data कमी)`,
      hi: `Stock ${x.stock}, minimum ${x.minStock} (बिक्री का data कम)`,
      hinglish: `Stock ${x.stock}, minimum ${x.minStock} (limited sales data)`,
    }[lang];
  }
  if (days !== undefined) {
    return {
      mr: `सुमारे ${days} दिवसांचा stock बाकी (रोज ~${perDay} विकतात)`,
      hi: `लगभग ${days} दिन का stock बचा (रोज़ ~${perDay} बिकते हैं)`,
      hinglish: `~${days} din ka stock bacha (roz ~${perDay} bikte hain)`,
    }[lang];
  }
  return {
    mr: `Stock ${x.stock}, minimum ${x.minStock} पेक्षा कमी`,
    hi: `Stock ${x.stock}, minimum ${x.minStock} से कम`,
    hinglish: `Stock ${x.stock}, minimum ${x.minStock} se kam`,
  }[lang];
}
