/**
 * Append-only ledger helpers. Pure functions, no I/O.
 * Stock is always derived from the ledger; nothing is ever deleted.
 */
import type { LedgerEntry } from '../contracts/types';

/** Current stock for a product = sum of all deltas (corrections included). */
export function stockOf(ledger: LedgerEntry[], productId: string): number {
  let s = 0;
  for (const e of ledger) if (e.productId === productId) s += e.qtyDelta;
  return s;
}

/**
 * Effective delta of an original (non-correction) entry after all corrections
 * that point at it. An undone entry has effective delta 0.
 */
export function effectiveDelta(ledger: LedgerEntry[], entryId: string): number | undefined {
  const orig = ledger.find((e) => e.id === entryId);
  if (!orig || orig.type === 'correction') return undefined;
  let d = orig.qtyDelta;
  for (const e of ledger) if (e.correctsEntryId === entryId) d += e.qtyDelta;
  return d;
}

/**
 * The most recent entry that can still be undone: not a correction, at index ≥
 * `firstUndoable` (so seeded history is never undone), and not already undone.
 */
export function undoTarget(ledger: LedgerEntry[], firstUndoable: number): LedgerEntry | undefined {
  for (let i = ledger.length - 1; i >= firstUndoable; i--) {
    const e = ledger[i];
    if (e.type === 'correction') continue;
    if (effectiveDelta(ledger, e.id) !== 0) return e;
  }
  return undefined;
}

/** Delta needed so that `entry`'s effective quantity becomes `newQty` (same direction). */
export function correctionDelta(ledger: LedgerEntry[], entry: LedgerEntry, newQty: number): number {
  const current = effectiveDelta(ledger, entry.id) ?? 0;
  const sign = entry.qtyDelta < 0 ? -1 : 1;
  return sign * newQty - current;
}
