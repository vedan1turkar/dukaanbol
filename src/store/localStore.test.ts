import { describe, expect, it } from 'vitest';
import { contractSuite } from './contract.suite';
import { createLocalStore, type StorageLike } from './localStore';

const NOW = new Date('2026-11-28T10:00:00Z');
let tick = 0;
const clock = () => new Date(NOW.getTime() + tick++ * 1000);
const make = (storage: StorageLike | null = null) => createLocalStore({ storage, now: clock });

contractSuite('local', () => make());

function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('real store — ledger & undo', () => {
  it('rejects zero, negative and fractional quantities', () => {
    const s = make();
    expect(s.recordSale('p-maggi', 0).ok).toBe(false);
    expect(s.recordSale('p-maggi', -3).ok).toBe(false);
    expect(s.recordSale('p-maggi', 1.5).ok).toBe(false);
    expect(s.recordArrival('p-nope', 5).ok).toBe(false);
  });

  it('refusal message says how much stock is actually there', () => {
    const r = make().recordSale('p-maggi', 50);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('18');
  });

  it('undo twice walks back two changes; never undoes seed history', () => {
    const s = make();
    expect(s.undoLast().ok).toBe(false); // only seed history so far
    s.recordSale('p-maggi', 3);
    s.recordArrival('p-maggi', 10);
    expect(s.getStock('p-maggi')).toBe(25);
    s.undoLast();
    expect(s.getStock('p-maggi')).toBe(15);
    s.undoLast();
    expect(s.getStock('p-maggi')).toBe(18);
    expect(s.undoLast().ok).toBe(false);
  });

  it('correction changes quantity without erasing the original', () => {
    const s = make();
    const sale = s.recordSale('p-parleg', 10);
    if (!sale.ok) throw new Error();
    expect(s.correct(sale.value.id, 15).ok).toBe(true);
    expect(s.getStock('p-parleg')).toBe(25);
    const hist = s.getHistory({ productId: 'p-parleg' });
    expect(hist.some((e) => e.id === sale.value.id && e.qtyDelta === -10)).toBe(true);
    expect(hist[0].correctsEntryId).toBe(sale.value.id);
    // undo after correction restores the full original
    s.undoLast();
    expect(s.getStock('p-parleg')).toBe(40);
  });

  it('will not undo an arrival if that would make stock negative', () => {
    const s = make();
    const sale = s.recordSale('p-colgate', 10); // 12 → 2
    s.recordArrival('p-colgate', 5); // → 7
    if (!sale.ok) throw new Error();
    s.correct(sale.value.id, 17); // earlier sale was really 17 → 0
    expect(s.getStock('p-colgate')).toBe(0);
    // last undoable entry is the arrival; undoing it would go to -5
    expect(s.undoLast().ok).toBe(false);
    expect(s.getStock('p-colgate')).toBe(0);
  });

  it('persists to storage and reloads', () => {
    const storage = memoryStorage();
    const a = make(storage);
    a.recordSale('p-maggi', 4);
    const b = make(storage);
    expect(b.getStock('p-maggi')).toBe(14);
  });
});

describe('real store — batches & expiry', () => {
  it('sales use first-expiring stock first (FEFO)', () => {
    const s = make();
    const before = s.getBatches('p-parleg');
    expect(before.map((b) => b.qty)).toEqual([12, 28]);
    s.recordSale('p-parleg', 10);
    expect(s.getBatches('p-parleg').map((b) => b.qty)).toEqual([2, 28]);
  });

  it('lists batches expiring within N days, soonest first', () => {
    const s = make();
    const exp = s.getExpiring(7);
    expect(exp.map((x) => x.product.id)).toEqual(['p-amulmilk', 'p-bread', 'p-parleg']);
    expect(exp.find((x) => x.product.id === 'p-parleg')?.batch.qty).toBe(12);
  });

  it('arrival with expiry creates a new batch; no expiry is never invented', () => {
    const s = make();
    s.recordArrival('p-maggi', 24, { expiryDate: '2026-12-01' });
    s.recordArrival('p-sugar', 5);
    expect(s.getBatches('p-maggi').some((b) => b.expiryDate === '2026-12-01' && b.qty === 24)).toBe(true);
    expect(s.getBatches('p-sugar').every((b) => b.expiryDate === undefined)).toBe(true);
  });
});

describe('real store — product matching', () => {
  const s = make();
  const top = (q: string) => s.findProducts(q)[0]?.id;
  it.each([
    ['Parle-G', 'p-parleg'],
    ['parle ji', 'p-parleg'],
    ['पार्ले जी', 'p-parleg'],
    ['maggie', 'p-maggi'],
    ['मैगी', 'p-maggi'],
    ['मॅगी', 'p-maggi'],
    ['आज 10 Parle-G चे packets विकले', 'p-parleg'],
    ['अमूल दूध', 'p-amulmilk'],
    ['टाटा मीठ', 'p-tatasalt'],
  ])('%s → %s', (q, id) => expect(top(q)).toBe(id));

  it('ambiguous "टाटा" returns both Tata products so the user can choose', () => {
    const ids = s.findProducts('टाटा').map((p) => p.id);
    expect(ids).toContain('p-tatasalt');
    expect(ids).toContain('p-tea');
  });

  it('unknown product returns nothing', () => {
    expect(s.findProducts('Kurkure')).toEqual([]);
  });

  it('rejects duplicate products by alias', () => {
    const r = make().addProduct({ name: 'Maggi Masala', aliases: ['मॅगी'], unit: 'packet', minStock: 5, importance: 1 }, 10);
    expect(r.ok).toBe(false);
  });
});

describe('real store — reorder & procurement agent', () => {
  it('recommends Maggi (low) from sales history, not Parle-G at first', () => {
    const recs = make().recommend();
    const maggi = recs.find((r) => r.productId === 'p-maggi');
    expect(maggi).toBeDefined();
    expect(maggi!.limitedData).toBe(false);
    expect(maggi!.suggestedQty).toBeGreaterThan(0);
    expect(recs.some((r) => r.productId === 'p-parleg')).toBe(false);
  });

  it('demo journey: selling 10 Parle-G makes it a reorder candidate', () => {
    const s = make();
    s.recordSale('p-parleg', 10);
    expect(s.recommend().some((r) => r.productId === 'p-parleg')).toBe(true);
  });

  it('new product with no history uses threshold and is flagged limited data', () => {
    const s = make();
    const p = s.addProduct({ name: 'Kurkure', aliases: ['कुरकुरे'], unit: 'packet', minStock: 5, costPrice: 9, importance: 1 }, 2);
    if (!p.ok) throw new Error(p.reason);
    const rec = s.recommend().find((r) => r.productId === p.value.id);
    expect(rec?.limitedData).toBe(true);
    expect(rec?.suggestedQty).toBe(8);
  });

  it.each([3000, 1000, 250, 0])('purchase order for budget ₹%i never exceeds budget', (budget) => {
    const s = make();
    s.recordSale('p-parleg', 10);
    const recs = s.recommend();
    const po = s.buildPurchaseOrder(budget);
    expect(po.total).toBeLessThanOrEqual(budget);
    expect(po.remainingBudget).toBeCloseTo(budget - po.total);
    // every unit is either ordered or deferred
    for (const r of recs) {
      const ordered = po.bySupplier.flatMap((g) => g.lines).find((l) => l.productId === r.productId)?.qty ?? 0;
      const deferred = po.deferred.find((d) => d.productId === r.productId)?.suggestedQty ?? 0;
      expect(ordered + deferred).toBe(r.suggestedQty);
    }
    expect(po.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('small budget defers items and says so', () => {
    const po = make().buildPurchaseOrder(250);
    expect(po.deferred.length).toBeGreaterThan(0);
  });

  it('groups order lines by supplier', () => {
    const po = make().buildPurchaseOrder(100000);
    const ids = po.bySupplier.map((g) => g.supplierId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(po.deferred).toEqual([]);
  });

  it('approval saves a record marked not-sent, and cannot be approved twice', () => {
    const s = make();
    const po = s.buildPurchaseOrder(3000);
    const a = s.approvePO(po);
    expect(a.ok && a.value.status).toBe('approved_not_sent');
    expect(s.approvePO(po).ok).toBe(false);
    expect(s.listApprovedPOs()).toHaveLength(1);
  });
});
