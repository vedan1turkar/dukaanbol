/**
 * Budget-aware procurement agent. Deterministic.
 *
 * 1. Take recommendations (already ranked by urgency).
 * 2. Walk them in order; take the full quantity if it fits the remaining budget,
 *    otherwise take as many units as fit and defer the rest.
 * 3. Items with unknown cost are included but flagged (they can't be budget-checked).
 * 4. Group lines by supplier. Record each step so the UI can show the agent's work.
 */
import type {
  AgentStep,
  Lang,
  POLine,
  Product,
  PurchaseOrderDraft,
  Recommendation,
  Supplier,
} from '../contracts/types';
import { round2 } from './reorder';

export function buildPurchaseOrder(args: {
  recs: Recommendation[];
  products: Product[];
  suppliers: Supplier[];
  budget: number;
  now: Date;
  id: string;
  lang: Lang;
}): PurchaseOrderDraft {
  const { recs, products, suppliers, budget, now, id, lang } = args;
  const t = TEXT[lang];
  const steps: AgentStep[] = [{ label: t.budget(budget) }];
  steps.push({ label: t.needs(recs.length), detail: recs.map((r) => name(products, r.productId)).join(', ') });

  const lines: (POLine & { supplierId: string })[] = [];
  const deferred: Recommendation[] = [];
  let remaining = budget;
  let hasUnknownPrices = false;
  let trimmed = 0;

  for (const r of recs) {
    const unit = products.find((p) => p.id === r.productId)?.costPrice;
    const supplierId = r.supplierId ?? 'unknown';
    if (unit === undefined) {
      hasUnknownPrices = true;
      lines.push({ supplierId, productId: r.productId, qty: r.suggestedQty });
      continue;
    }
    const affordable = unit > 0 ? Math.floor(round2(remaining) / unit) : r.suggestedQty;
    const qty = Math.min(r.suggestedQty, affordable);
    if (qty > 0) {
      const lineTotal = round2(qty * unit);
      lines.push({ supplierId, productId: r.productId, qty, unitCost: unit, lineTotal });
      remaining = round2(remaining - lineTotal);
    }
    if (qty < r.suggestedQty) {
      trimmed++;
      const left = r.suggestedQty - qty;
      deferred.push({ ...r, suggestedQty: left, estimatedCost: round2(left * unit) });
    }
  }

  const total = round2(budget - remaining);
  const requested = round2(recs.reduce((s, r) => s + (r.estimatedCost ?? 0), 0));
  steps.push({ label: t.qtys, detail: t.requested(requested) });
  if (hasUnknownPrices) steps.push({ label: t.unknownPrices });
  steps.push(trimmed > 0 ? { label: t.over(round2(requested - budget)), detail: t.trimmed(trimmed) } : { label: t.within });

  const supplierIds = [...new Set(lines.map((l) => l.supplierId))];
  const bySupplier = supplierIds.map((sid) => {
    const ls: POLine[] = lines.filter((l) => l.supplierId === sid).map(({ supplierId: _s, ...l }) => l);
    return { supplierId: sid, lines: ls, subtotal: round2(ls.reduce((s, l) => s + (l.lineTotal ?? 0), 0)) };
  });
  steps.push({
    label: t.ready(supplierIds.length),
    detail: supplierIds.map((s) => suppliers.find((x) => x.id === s)?.name ?? s).join(', '),
  });

  return {
    id,
    createdAt: now.toISOString(),
    budget,
    bySupplier,
    total,
    remainingBudget: remaining,
    deferred,
    steps,
    hasUnknownPrices,
  };
}

const name = (products: Product[], id: string) => products.find((p) => p.id === id)?.name ?? id;

const TEXT: Record<Lang, {
  budget: (n: number) => string; needs: (n: number) => string; qtys: string; requested: (n: number) => string;
  unknownPrices: string; over: (n: number) => string; trimmed: (n: number) => string; within: string; ready: (n: number) => string;
}> = {
  mr: {
    budget: (n) => `Budget ₹${n} नोंदवले`,
    needs: (n) => `${n} products ना restock हवा`,
    qtys: 'विक्रीवरून quantity ठरवली',
    requested: (n) => `पूर्ण order ₹${n}`,
    unknownPrices: 'काही products ची किंमत माहित नाही — total मध्ये धरली नाही',
    over: (n) => `Budget पेक्षा ₹${n} जास्त — order कमी केला`,
    trimmed: (n) => `${n} items पुढे ढकलले`,
    within: 'Budget मध्ये बसतो',
    ready: (n) => `${n} suppliers साठी order तयार`,
  },
  hi: {
    budget: (n) => `Budget ₹${n} दर्ज किया`,
    needs: (n) => `${n} products को restock चाहिए`,
    qtys: 'बिक्री के हिसाब से quantity तय की',
    requested: (n) => `पूरा order ₹${n}`,
    unknownPrices: 'कुछ products की कीमत पता नहीं — total में नहीं जोड़ी',
    over: (n) => `Budget से ₹${n} ज़्यादा — order कम किया`,
    trimmed: (n) => `${n} items बाद के लिए रखे`,
    within: 'Budget में है',
    ready: (n) => `${n} suppliers के लिए order तैयार`,
  },
  hinglish: {
    budget: (n) => `Budget ₹${n} saved`,
    needs: (n) => `${n} products need restocking`,
    qtys: 'Quantities calculated from sales',
    requested: (n) => `Full order ₹${n}`,
    unknownPrices: 'Some prices unknown — not counted in total',
    over: (n) => `₹${n} over budget — order reduced`,
    trimmed: (n) => `${n} items deferred`,
    within: 'Within budget',
    ready: (n) => `Order ready for ${n} suppliers`,
  },
};
