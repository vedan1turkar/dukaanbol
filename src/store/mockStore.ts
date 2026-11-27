/**
 * MOCK store — in-memory, simple logic, good enough for Aditya to build the
 * voice loop on Day 1. NOT the real implementation:
 *  - findProducts is a plain substring match (real one: alias + fuzzy)
 *  - recommend / buildPurchaseOrder use naive rules (real one: sales velocity + budget agent)
 *  - nothing is persisted (real one: localStorage)
 * Vedant replaces this with the real store at the 28 Nov 7 pm checkpoint.
 */
import type { DukaanStore } from '../contracts/store';
import type {
  ApprovedPO,
  Batch,
  LedgerEntry,
  Product,
  PurchaseOrderDraft,
  Recommendation,
  Result,
  ShopSettings,
} from '../contracts/types';
import { buildSeed, DEFAULT_SETTINGS } from '../seed/seed';

const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: string): Result<never> => ({ ok: false, reason });

export function createMockStore(): DukaanStore {
  let settings: ShopSettings = { ...DEFAULT_SETTINGS };
  let { products, suppliers, batches, ledger } = buildSeed();
  products = [...products];
  let pos: ApprovedPO[] = [];
  const listeners = new Set<() => void>();
  let seq = 0;
  const newId = (p: string) => `${p}-mock-${Date.now()}-${++seq}`;
  const emit = () => listeners.forEach((l) => l());

  const stockOf = (productId: string) =>
    ledger.filter((e) => e.productId === productId).reduce((s, e) => s + e.qtyDelta, 0);
  const append = (e: Omit<LedgerEntry, 'id' | 'at'>): LedgerEntry => {
    const entry: LedgerEntry = { ...e, id: newId('l'), at: new Date().toISOString() };
    ledger = [...ledger, entry];
    emit();
    return entry;
  };

  const store: DukaanStore = {
    getSettings: () => settings,
    listProducts: () => products,
    listSuppliers: () => suppliers,
    getProduct: (id) => products.find((p) => p.id === id),
    findProducts(query) {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase())),
      );
    },
    getStock: stockOf,
    getBatches: (id) => batches.filter((b) => b.productId === id),
    getExpiring(withinDays) {
      const now = Date.now();
      return batches
        .filter((b) => b.expiryDate)
        .map((b) => ({ batch: b, daysLeft: Math.ceil((Date.parse(b.expiryDate!) - now) / 86_400_000) }))
        .filter((x) => x.daysLeft <= withinDays)
        .map((x) => ({ ...x, product: products.find((p) => p.id === x.batch.productId)! }))
        .sort((a, b) => a.daysLeft - b.daysLeft);
    },
    getLowStock: () =>
      products.map((product) => ({ product, qty: stockOf(product.id) })).filter((x) => x.qty <= x.product.minStock),
    getHistory: (f) =>
      ledger
        .filter((e) => (!f?.type || e.type === f.type) && (!f?.productId || e.productId === f.productId))
        .slice()
        .reverse(),
    listApprovedPOs: () => pos,

    updateSettings(patch) {
      settings = { ...settings, ...patch };
      emit();
      return settings;
    },
    recordSale(productId, qty, meta) {
      if (!(qty > 0)) return fail('Quantity शून्यापेक्षा जास्त हवी.');
      const have = stockOf(productId);
      if (qty > have) return fail(`Stock फक्त ${have} आहे.`);
      return ok(append({ type: 'sale', productId, qtyDelta: -qty, source: meta?.source ?? 'voice', transcript: meta?.transcript }));
    },
    recordArrival(productId, qty, opts) {
      if (!(qty > 0)) return fail('Quantity शून्यापेक्षा जास्त हवी.');
      const batch: Batch = { id: newId('b'), productId, qty, expiryDate: opts?.expiryDate, receivedAt: new Date().toISOString() };
      batches = [...batches, batch];
      return ok(append({ type: 'arrival', productId, qtyDelta: qty, source: opts?.source ?? 'voice', transcript: opts?.transcript, supplierId: opts?.supplierId, batchId: batch.id }));
    },
    recordDamage(productId, qty, note) {
      if (qty > stockOf(productId)) return fail(`Stock फक्त ${stockOf(productId)} आहे.`);
      return ok(append({ type: 'damage', productId, qtyDelta: -qty, source: 'manual', note }));
    },
    undoLast() {
      const corrected = new Set(ledger.map((e) => e.correctsEntryId).filter(Boolean));
      const last = [...ledger].reverse().find((e) => e.type !== 'correction' && !corrected.has(e.id) && e.note !== 'Opening stock');
      if (!last) return fail('Undo करण्यासारखे काही नाही.');
      return ok(append({ type: 'correction', productId: last.productId, qtyDelta: -last.qtyDelta, source: 'manual', correctsEntryId: last.id, note: 'Undo' }));
    },
    correct(entryId, newQty) {
      const orig = ledger.find((e) => e.id === entryId);
      if (!orig) return fail('Entry सापडली नाही.');
      const sign = orig.qtyDelta < 0 ? -1 : 1;
      const delta = sign * newQty - orig.qtyDelta;
      if (stockOf(orig.productId) + delta < 0) return fail('यामुळे stock negative होईल.');
      return ok(append({ type: 'correction', productId: orig.productId, qtyDelta: delta, source: 'manual', correctsEntryId: orig.id, note: `Quantity → ${newQty}` }));
    },
    addProduct(p, openingQty, expiryDate) {
      const names = [p.name, ...p.aliases].map((s) => s.toLowerCase());
      const dup = products.find((x) => [x.name, ...x.aliases].some((a) => names.includes(a.toLowerCase())));
      if (dup) return fail(`"${dup.name}" आधीच inventory मध्ये आहे.`);
      const product: Product = { ...p, id: newId('p') };
      products = [...products, product];
      if (openingQty > 0) store.recordArrival(product.id, openingQty, { expiryDate, source: 'manual' });
      emit();
      return ok(product);
    },

    recommend(): Recommendation[] {
      return store.getLowStock().map(({ product, qty }) => {
        const suggestedQty = product.minStock * 2 - qty;
        return {
          productId: product.id,
          currentQty: qty,
          suggestedQty,
          estimatedCost: product.costPrice ? product.costPrice * suggestedQty : undefined,
          supplierId: product.supplierId,
          reason: `Stock ${qty}, minimum ${product.minStock}`,
          urgency: product.minStock - qty + product.importance,
          limitedData: true,
        };
      }).sort((a, b) => b.urgency - a.urgency);
    },
    buildPurchaseOrder(budget): PurchaseOrderDraft {
      const recs = store.recommend();
      let total = 0;
      const lines: { supplierId: string; productId: string; qty: number; unitCost?: number; lineTotal?: number }[] = [];
      const deferred: Recommendation[] = [];
      for (const r of recs) {
        const cost = r.estimatedCost ?? 0;
        if (total + cost <= budget) {
          total += cost;
          const unitCost = products.find((p) => p.id === r.productId)?.costPrice;
          lines.push({ supplierId: r.supplierId ?? 'unknown', productId: r.productId, qty: r.suggestedQty, unitCost, lineTotal: r.estimatedCost });
        } else deferred.push(r);
      }
      const supplierIds = [...new Set(lines.map((l) => l.supplierId))];
      return {
        id: newId('po'),
        createdAt: new Date().toISOString(),
        budget,
        bySupplier: supplierIds.map((supplierId) => {
          const ls = lines.filter((l) => l.supplierId === supplierId).map(({ supplierId: _s, ...l }) => l);
          return { supplierId, lines: ls, subtotal: ls.reduce((s, l) => s + (l.lineTotal ?? 0), 0) };
        }),
        total,
        remainingBudget: budget - total,
        deferred,
        steps: [
          { label: `Budget ₹${budget}` },
          { label: `${recs.length} products need restocking` },
          { label: 'Quantities calculated (MOCK)' },
          { label: deferred.length ? `${deferred.length} items deferred to stay in budget` : 'Within budget' },
          { label: 'Order ready for approval' },
        ],
        hasUnknownPrices: recs.some((r) => r.estimatedCost === undefined),
      };
    },
    approvePO(draft) {
      const po: ApprovedPO = { ...draft, approvedAt: new Date().toISOString(), status: 'approved_not_sent' };
      pos = [...pos, po];
      emit();
      return ok(po);
    },

    resetDemo() {
      ({ products, suppliers, batches, ledger } = buildSeed());
      pos = [];
      settings = { ...DEFAULT_SETTINGS };
      emit();
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  return store;
}
