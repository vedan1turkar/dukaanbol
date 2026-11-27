/**
 * The ONE place that decides which store the app uses.
 * Day 1: mock. At the 28 Nov 7 pm checkpoint Vedant swaps this line to the real store.
 */
import { useSyncExternalStore } from 'react';
import type { DukaanStore } from '../contracts/store';
import { createMockStore } from './mockStore';

export const store: DukaanStore = createMockStore();

/** Re-render a component whenever store data changes. Usage: `useStoreVersion();` then call store.* */
let version = 0;
store.subscribe(() => {
  version++;
});
export function useStoreVersion(): number {
  return useSyncExternalStore(store.subscribe, () => version);
}
