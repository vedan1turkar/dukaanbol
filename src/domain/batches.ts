/**
 * Batch quantities are DERIVED, not stored, so undo/corrections always stay consistent.
 * Assumption: shop sells first-expiring stock first (FEFO). So whatever stock remains
 * sits in the latest-expiring batches. Remaining stock is poured into batches from the
 * latest expiry backwards, each capped at the quantity it arrived with.
 */
import type { Batch } from '../contracts/types';

export interface StoredBatch extends Omit<Batch, 'qty'> {
  initialQty: number;
}

const NO_EXPIRY = '9999-12-31';

export function remainingBatches(batches: StoredBatch[], stock: number): Batch[] {
  const sorted = [...batches].sort((a, b) => {
    const ea = a.expiryDate ?? NO_EXPIRY;
    const eb = b.expiryDate ?? NO_EXPIRY;
    if (ea !== eb) return ea < eb ? 1 : -1; // latest expiry first
    return a.receivedAt < b.receivedAt ? 1 : -1; // then newest first
  });
  let left = Math.max(0, stock);
  const out: Batch[] = [];
  for (const b of sorted) {
    const qty = Math.min(b.initialQty, left);
    left -= qty;
    const { initialQty: _i, ...rest } = b;
    out.push({ ...rest, qty });
  }
  // Return earliest expiry first for display
  return out.reverse();
}

export function daysBetween(fromIso: string, toDate: string): number {
  const from = new Date(fromIso);
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.parse(toDate + 'T00:00:00Z');
  return Math.round((end - start) / 86_400_000);
}
