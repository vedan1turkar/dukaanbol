import { describe, expect, it } from 'vitest';
import type { DukaanStore } from '../contracts/store';

// Behaviour of the CONTRACT that both sides rely on.
// Run against every store implementation (see *.test.ts next to this file).
export function contractSuite(name: string, createStore: () => DukaanStore) {
describe(`DukaanStore contract (${name})`, () => {
  it('seeds the demo story: Maggi is 18 and low', () => {
    const s = createStore();
    expect(s.getStock('p-maggi')).toBe(18);
    expect(s.getLowStock().some((x) => x.product.id === 'p-maggi')).toBe(true);
  });

  it('records a sale and updates stock', () => {
    const s = createStore();
    const r = s.recordSale('p-parleg', 10);
    expect(r.ok).toBe(true);
    expect(s.getStock('p-parleg')).toBe(30);
  });

  it('never allows negative stock', () => {
    const s = createStore();
    const r = s.recordSale('p-maggi', 50);
    expect(r.ok).toBe(false);
    expect(s.getStock('p-maggi')).toBe(18);
  });

  it('undo appends a correction instead of deleting', () => {
    const s = createStore();
    s.recordSale('p-parleg', 10);
    const before = s.getHistory().length;
    const u = s.undoLast();
    expect(u.ok).toBe(true);
    expect(s.getStock('p-parleg')).toBe(40);
    expect(s.getHistory().length).toBe(before + 1);
  });

  it('finds Parle-G by Marathi alias', () => {
    const s = createStore();
    expect(s.findProducts('पार्ले जी')[0]?.id).toBe('p-parleg');
  });

  it('flags the Parle-G batch expiring within 7 days', () => {
    const s = createStore();
    expect(s.getExpiring(7).some((x) => x.product.id === 'p-parleg' && x.batch.qty === 12)).toBe(true);
  });

  it('purchase order stays within budget', () => {
    const s = createStore();
    const po = s.buildPurchaseOrder(500);
    expect(po.total).toBeLessThanOrEqual(500);
    expect(po.remainingBudget).toBe(500 - po.total);
  });
});
}
