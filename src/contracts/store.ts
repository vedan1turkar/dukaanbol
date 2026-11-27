/**
 * SHARED CONTRACT — the only way UI/voice code touches data.
 * Implemented by `src/store/mockStore.ts` (Day 1) and the real store (Vedant).
 */
import type {
  ApprovedPO,
  Batch,
  LedgerEntry,
  LedgerType,
  Product,
  PurchaseOrderDraft,
  Recommendation,
  Result,
  ShopSettings,
  Supplier,
} from './types';

export interface DukaanStore {
  // ---------- reads (answered immediately, no confirmation) ----------
  getSettings(): ShopSettings;
  listProducts(): Product[];
  listSuppliers(): Supplier[];
  getProduct(productId: string): Product | undefined;
  /** Alias + fuzzy search. Returns best matches first. */
  findProducts(query: string): Product[];
  getStock(productId: string): number;
  getBatches(productId: string): Batch[];
  getExpiring(withinDays: number): { product: Product; batch: Batch; daysLeft: number }[];
  getLowStock(): { product: Product; qty: number }[];
  getHistory(filter?: { type?: LedgerType; productId?: string }): LedgerEntry[];
  listApprovedPOs(): ApprovedPO[];

  // ---------- writes — call ONLY after the user confirmed ----------
  updateSettings(patch: Partial<ShopSettings>): ShopSettings;
  /** Refuses (ok:false) if qty > stock. Never creates negative stock. */
  recordSale(productId: string, qty: number, meta?: { transcript?: string; source?: 'voice' | 'manual' }): Result<LedgerEntry>;
  recordArrival(
    productId: string,
    qty: number,
    opts?: { expiryDate?: string; supplierId?: string; transcript?: string; source?: 'voice' | 'manual' },
  ): Result<LedgerEntry>;
  recordDamage(productId: string, qty: number, note?: string): Result<LedgerEntry>;
  /** Reverses the last non-reversed change by appending a correction. */
  undoLast(): Result<LedgerEntry>;
  /** Changes the quantity of an earlier entry by appending a correction. */
  correct(entryId: string, newQty: number): Result<LedgerEntry>;
  /** Rejects duplicates (same name or alias). */
  addProduct(p: Omit<Product, 'id'>, openingQty: number, expiryDate?: string): Result<Product>;

  // ---------- procurement ----------
  recommend(): Recommendation[];
  buildPurchaseOrder(budget: number): PurchaseOrderDraft;
  approvePO(draft: PurchaseOrderDraft): Result<ApprovedPO>;

  // ---------- demo ----------
  resetDemo(): void;
  /** UI re-renders when data changes. Returns unsubscribe. */
  subscribe(listener: () => void): () => void;
}
