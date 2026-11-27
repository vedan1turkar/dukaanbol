/**
 * The ONE place that decides which store the app uses.
 * Real store (localStorage). It passes the same contract tests as the mock
 * (src/store/contract.suite.ts). To isolate a bug, swap to `createMockStore()`.
 */
import { useSyncExternalStore } from 'react';
import type { DukaanStore } from '../contracts/store';
import { createLocalStore } from './localStore';

export const store: DukaanStore = createLocalStore();

/** Re-render a component whenever store data changes. Usage: `useStoreVersion();` then call store.* */
let version = 0;
store.subscribe(() => {
  version++;
});
export function useStoreVersion(): number {
  return useSyncExternalStore(store.subscribe, () => version);
}
