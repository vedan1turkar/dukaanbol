/**
 * SHARED CONTRACT — owned by both Vedant and Aditya.
 * Frozen after the 28 Nov morning sync. Change only via a small PR approved by both.
 *
 * The seam: the voice/NLU layer (Aditya) produces `ParseResult` / `Intent`;
 * the domain/store layer (Vedant) executes intents through `DukaanStore`.
 */

export type Lang = 'mr' | 'hi' | 'hinglish';
export type Unit = 'packet' | 'kg' | 'litre' | 'piece' | 'box';

export interface Supplier {
  id: string;
  name: string; // "Sharma Distributors"
  phone?: string;
  leadTimeDays?: number; // default lead time for this supplier
}

export interface Product {
  id: string;
  name: string; // "Parle-G"
  aliases: string[]; // ["पार्ले जी", "parle g", "पारले"]
  unit: Unit;
  category?: string;
  minStock: number; // owner-set reorder threshold
  costPrice?: number; // ₹ per unit, if known
  sellPrice?: number; // ₹ per unit, if known
  supplierId?: string;
  leadTimeDays?: number; // overrides supplier lead time
  importance: 1 | 2 | 3; // owner-set, 3 = most important
}

export interface Batch {
  id: string;
  productId: string;
  qty: number; // remaining in this batch
  expiryDate?: string; // ISO date (YYYY-MM-DD). NEVER invented.
  batchNo?: string;
  receivedAt: string; // ISO timestamp
}

export type LedgerType = 'sale' | 'arrival' | 'damage' | 'correction';

/** Append-only. Undo/edit never deletes — it adds a `correction` pointing at the original. */
export interface LedgerEntry {
  id: string;
  type: LedgerType;
  productId: string;
  qtyDelta: number; // sale/damage = negative, arrival = positive, correction = +/- adjustment
  at: string; // ISO timestamp
  source: 'voice' | 'manual';
  transcript?: string; // what the user said, for audit
  correctsEntryId?: string; // set on corrections
  batchId?: string;
  supplierId?: string;
  note?: string;
}

/** A complete, unambiguous request. Only produced when nothing is missing. */
export type Intent =
  | { kind: 'sale'; productId: string; qty: number }
  | { kind: 'arrival'; productId: string; qty: number; expiryDate?: string; supplierId?: string }
  | { kind: 'damage'; productId: string; qty: number }
  | { kind: 'stock_check'; productId: string }
  | { kind: 'expiry_check'; withinDays?: number }
  | { kind: 'low_stock_check' }
  | { kind: 'reorder' }
  | { kind: 'set_budget'; amount: number }
  | { kind: 'undo' }
  | { kind: 'edit_qty'; entryId: string; newQty: number };

/** Intents that change inventory MUST be confirmed by the user before calling the store. */
export const WRITE_INTENTS: ReadonlyArray<Intent['kind']> = [
  'sale',
  'arrival',
  'damage',
  'undo',
  'edit_qty',
];

export type Confidence = 'high' | 'medium' | 'low';

export interface ClarifyChoice {
  label: string; // shown on button, in user's language
  value: string | number; // productId, quantity, etc.
}

export interface ParseResult {
  transcript: string;
  lang: Lang;
  intent?: Intent; // set only when complete and unambiguous
  confidence: Confidence;
  /** Ask exactly ONE question at a time. */
  clarify?: {
    question: string; // already in the user's language
    missing?: 'intent' | 'product' | 'qty' | 'expiry' | 'unit';
    choices?: ClarifyChoice[]; // e.g. two quantities (15 vs 50) or several matching products
  };
  unknownProductName?: string; // → offer "add new product"
}

/** Errors are returned as values, never thrown. `reason` is safe to show/speak. */
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

// ---------- Procurement ----------

export interface Recommendation {
  productId: string;
  currentQty: number;
  suggestedQty: number;
  estimatedCost?: number; // undefined if cost price unknown
  supplierId?: string;
  reason: string; // e.g. "3 दिवसांचा stock बाकी"
  urgency: number; // higher = more urgent (deterministic score)
  limitedData: boolean; // true if based on threshold, not sales history
}

export interface POLine {
  productId: string;
  qty: number;
  unitCost?: number;
  lineTotal?: number;
}

export interface AgentStep {
  label: string; // shown on screen, e.g. "4 products need restocking"
  detail?: string;
}

export interface PurchaseOrderDraft {
  id: string;
  createdAt: string;
  budget: number;
  bySupplier: { supplierId: string | 'unknown'; lines: POLine[]; subtotal: number }[];
  total: number;
  remainingBudget: number;
  deferred: Recommendation[]; // items that did not fit in budget
  steps: AgentStep[]; // the agent's visible reasoning trail
  hasUnknownPrices: boolean;
}

export interface ApprovedPO extends PurchaseOrderDraft {
  approvedAt: string;
  /** Prototype only — never pretend a distributor received it. */
  status: 'approved_not_sent';
}

export interface ShopSettings {
  shopName: string;
  lang: Lang;
  dailyBudget?: number;
  expiryWarningDays: number; // default 7
  confidence: {
    // configurable; speech-engine scores are not comparable across engines
    high: number; // >= high → confirm card
    low: number; // < low → ask to repeat
  };
  onboarded: boolean;
}
