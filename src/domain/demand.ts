/**
 * Demand estimation from sales history. Deterministic.
 * Uses EFFECTIVE sales (after undo/corrections).
 */
import type { LedgerEntry } from '../contracts/types';
import { effectiveDelta } from './ledger';

export const DEMAND_WINDOW_DAYS = 14;
export const MIN_HISTORY_DAYS = 7;

export interface Demand {
  avgDaily: number; // units per day
  daysOfHistory: number; // how many days of data we actually have (≤ window)
  limitedData: boolean;
}

export function demandOf(ledger: LedgerEntry[], productId: string, now: Date, windowDays = DEMAND_WINDOW_DAYS): Demand {
  const windowStart = now.getTime() - windowDays * 86_400_000;
  let first = Infinity;
  let sold = 0;
  for (const e of ledger) {
    if (e.productId !== productId) continue;
    const t = Date.parse(e.at);
    if (t < first) first = t;
    if (e.type === 'sale' && t >= windowStart) {
      sold += -(effectiveDelta(ledger, e.id) ?? 0);
    }
  }
  if (!Number.isFinite(first)) return { avgDaily: 0, daysOfHistory: 0, limitedData: true };
  const daysOfHistory = Math.min(windowDays, Math.max(1, Math.round((now.getTime() - Math.max(first, windowStart)) / 86_400_000)));
  const avgDaily = sold / daysOfHistory;
  return { avgDaily, daysOfHistory, limitedData: daysOfHistory < MIN_HISTORY_DAYS || sold === 0 };
}
