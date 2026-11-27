/**
 * REAL store. Owner: Vedant.
 * Implements the DukaanStore contract on top of the pure domain functions,
 * persisted to localStorage (falls back to memory if storage is unavailable).
 */
import type { DukaanStore } from '../contracts/store';
import type {
  ApprovedPO,
  LedgerEntry,
  Product,
  Result,
  ShopSettings,
  Supplier,
} from '../contracts/types';
import { daysBetween, remainingBatches, type StoredBatch } from '../domain/batches';
import { correctionDelta, effectiveDelta, stockOf, undoTarget } from '../domain/ledger';
import { findDuplicate, matchProducts } from '../domain/match';
import { buildPurchaseOrder } from '../domain/procurement';
import { recommend } from '../domain/reorder';
import { buildSeed, DEFAULT_SETTINGS } from '../seed/seed';

const STORAGE_KEY = 'dukaanbol:v2';

interface State {
  version: 2;
  seedLength: number; // ledger[0..seedLength) is seed history and can't be undone
  settings: ShopSettings;
  products: Product[];
  suppliers: Supplier[];
  batches: StoredBatch[];
  ledger: LedgerEntry[];
  pos: ApprovedPO[];
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function freshState(now: Date): State {
  const seed = buildSeed(now);
  return {
    version: 2,
    seedLength: seed.ledger.length,
    settings: { ...DEFAULT_SETTINGS },
    products: seed.products,
    suppliers: seed.suppliers,
    batches: seed.batches.map(({ qty, ...b }) => ({ ...b, initialQty: qty })),
    ledger: seed.ledger,
    pos: [],
  };
}

const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: string): Result<never> => ({ ok: false, reason });

export function createLocalStore(opts: { storage?: StorageLike | null; now?: () => Date } = {}): DukaanStore {
  const storage = opts.storage === null ? undefined : opts.storage ?? defaultStorage();
  const now = opts.now ?? (() => new Date());
  const listeners = new Set<() => void>();
  let seq = 0;
  const newId = (prefix: string) => `${prefix}-${now().getTime().toString(36)}-${(++seq).toString(36)}`;

  let state: State = load() ?? freshState(now());

  function load(): State | undefined {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (!raw) return undefined;
      const s = JSON.parse(raw) as State;
      return s.version === 2 ? s : undefined;
    } catch {
      return undefined;
    }
  }
  function commit(next: State) {
    state = next;
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked — keep working in memory */
    }
    listeners.forEach((l) => l());
  }

  const stock = (productId: string) => stockOf(state.ledger, productId);
  const lang = () => state.settings.lang;
  const msg = (mr: string, hi: string, hinglish: string) => ({ mr, hi, hinglish })[lang()];
  const productName = (id: string) => state.products.find((p) => p.id === id)?.name ?? id;

  function append(e: Omit<LedgerEntry, 'id' | 'at'>, extra?: Partial<State>): LedgerEntry {
    const entry: LedgerEntry = { ...e, id: newId('l'), at: now().toISOString() };
    commit({ ...state, ...extra, ledger: [...state.ledger, entry] });
    return entry;
  }

  function checkQty(qty: number): Result<never> | undefined {
    if (!Number.isInteger(qty) || qty <= 0) return fail(msg('Quantity 1 किंवा जास्त हवी.', 'Quantity 1 या ज़्यादा होनी चाहिए.', 'Quantity 1 ya zyada honi chahiye.'));
    return undefined;
  }
  function checkProduct(productId: string): Result<never> | undefined {
    if (!state.products.some((p) => p.id === productId)) return fail(msg('हा product inventory मध्ये सापडला नाही.', 'यह product inventory में नहीं मिला.', 'Yeh product inventory mein nahi mila.'));
    return undefined;
  }
  function outflow(type: 'sale' | 'damage', productId: string, qty: number, meta: Partial<LedgerEntry>): Result<LedgerEntry> {
    const bad = checkProduct(productId) ?? checkQty(qty);
    if (bad) return bad;
    const have = stock(productId);
    if (qty > have) {
      const n = productName(productId);
      return fail(msg(`${n} चा stock फक्त ${have} आहे.`, `${n} का stock सिर्फ ${have} है.`, `${n} ka stock sirf ${have} hai.`));
    }
    return ok(append({ type, productId, qtyDelta: -qty, source: 'voice', ...meta }));
  }

  const store: DukaanStore = {
    // ---------- reads ----------
    getSettings: () => state.settings,
    listProducts: () => state.products,
    listSuppliers: () => state.suppliers,
    getProduct: (id) => state.products.find((p) => p.id === id),
    findProducts: (query) => matchProducts(state.products, query).map((m) => m.product),
    getStock: stock,
    getBatches: (productId) =>
      remainingBatches(state.batches.filter((b) => b.productId === productId), stock(productId)),
    getExpiring(withinDays) {
      const today = now().toISOString();
      const out: { product: Product; batch: ReturnType<DukaanStore['getBatches']>[number]; daysLeft: number }[] = [];
      for (const product of state.products) {
        for (const batch of store.getBatches(product.id)) {
          if (!batch.expiryDate || batch.qty <= 0) continue;
          const daysLeft = daysBetween(today, batch.expiryDate);
          if (daysLeft <= withinDays) out.push({ product, batch, daysLeft });
        }
      }
      return out.sort((a, b) => a.daysLeft - b.daysLeft);
    },
    getLowStock: () =>
      state.products.map((product) => ({ product, qty: stock(product.id) })).filter((x) => x.qty <= x.product.minStock),
    getHistory: (f) =>
      state.ledger
        .filter((e) => (!f?.type || e.type === f.type) && (!f?.productId || e.productId === f.productId))
        .slice()
        .reverse(),
    listApprovedPOs: () => state.pos.slice().reverse(),

    // ---------- writes ----------
    updateSettings(patch) {
      commit({ ...state, settings: { ...state.settings, ...patch } });
      return state.settings;
    },
    recordSale: (productId, qty, meta) => outflow('sale', productId, qty, { transcript: meta?.transcript, source: meta?.source ?? 'voice' }),
    recordDamage: (productId, qty, note) => outflow('damage', productId, qty, { note, source: 'manual' }),
    recordArrival(productId, qty, o) {
      const bad = checkProduct(productId) ?? checkQty(qty);
      if (bad) return bad;
      const batch: StoredBatch = { id: newId('b'), productId, initialQty: qty, expiryDate: o?.expiryDate, receivedAt: now().toISOString() };
      const supplierId = o?.supplierId ?? state.products.find((p) => p.id === productId)?.supplierId;
      return ok(
        append(
          { type: 'arrival', productId, qtyDelta: qty, source: o?.source ?? 'voice', transcript: o?.transcript, supplierId, batchId: batch.id },
          { batches: [...state.batches, batch] },
        ),
      );
    },
    undoLast() {
      const target = undoTarget(state.ledger, state.seedLength);
      if (!target) return fail(msg('Undo करण्यासारखे काही नाही.', 'Undo करने के लिए कुछ नहीं है.', 'Undo karne ke liye kuch nahi hai.'));
      const delta = -(effectiveDelta(state.ledger, target.id) ?? 0);
      if (stock(target.productId) + delta < 0) {
        return fail(msg('हे undo केल्यास stock negative होईल.', 'Undo करने से stock negative हो जाएगा.', 'Undo karne se stock negative ho jayega.'));
      }
      return ok(append({ type: 'correction', productId: target.productId, qtyDelta: delta, source: 'manual', correctsEntryId: target.id, note: 'undo' }));
    },
    correct(entryId, newQty) {
      const orig = state.ledger.find((e) => e.id === entryId);
      if (!orig || orig.type === 'correction') return fail(msg('ही entry सापडली नाही.', 'यह entry नहीं मिली.', 'Yeh entry nahi mili.'));
      if (!Number.isInteger(newQty) || newQty < 0) return checkQty(newQty) ?? fail('Invalid quantity');
      const delta = correctionDelta(state.ledger, orig, newQty);
      if (delta === 0) return fail(msg('Quantity आधीच तीच आहे.', 'Quantity पहले से यही है.', 'Quantity pehle se yahi hai.'));
      if (stock(orig.productId) + delta < 0) {
        return fail(msg('या बदलामुळे stock negative होईल.', 'इस बदलाव से stock negative हो जाएगा.', 'Is change se stock negative ho jayega.'));
      }
      return ok(append({ type: 'correction', productId: orig.productId, qtyDelta: delta, source: 'manual', correctsEntryId: orig.id, note: `qty → ${newQty}` }));
    },
    addProduct(p, openingQty, expiryDate) {
      if (!p.name.trim()) return fail(msg('Product चे नाव हवे.', 'Product का नाम चाहिए.', 'Product ka naam chahiye.'));
      const dup = findDuplicate(state.products, p);
      if (dup) return fail(msg(`"${dup.name}" आधीच inventory मध्ये आहे.`, `"${dup.name}" पहले से inventory में है.`, `"${dup.name}" pehle se inventory mein hai.`));
      if (!Number.isInteger(openingQty) || openingQty < 0) return fail('Invalid opening quantity');
      const product: Product = { ...p, name: p.name.trim(), id: newId('p') };
      commit({ ...state, products: [...state.products, product] });
      if (openingQty > 0) store.recordArrival(product.id, openingQty, { expiryDate, source: 'manual' });
      return ok(product);
    },

    // ---------- procurement ----------
    recommend: () =>
      recommend({ products: state.products, suppliers: state.suppliers, ledger: state.ledger, now: now(), lang: lang() }),
    buildPurchaseOrder(budget) {
      if (budget !== state.settings.dailyBudget) commit({ ...state, settings: { ...state.settings, dailyBudget: budget } });
      return buildPurchaseOrder({
        recs: store.recommend(),
        products: state.products,
        suppliers: state.suppliers,
        budget,
        now: now(),
        id: newId('po'),
        lang: lang(),
      });
    },
    approvePO(draft) {
      if (draft.total > draft.budget) return fail(msg('Order budget पेक्षा जास्त आहे.', 'Order budget से ज़्यादा है.', 'Order budget se zyada hai.'));
      if (state.pos.some((p) => p.id === draft.id)) return fail(msg('हा order आधीच approve केला आहे.', 'यह order पहले ही approve हो चुका है.', 'Yeh order pehle hi approve ho chuka hai.'));
      const po: ApprovedPO = { ...draft, approvedAt: now().toISOString(), status: 'approved_not_sent' };
      commit({ ...state, pos: [...state.pos, po] });
      return ok(po);
    },

    // ---------- demo ----------
    resetDemo() {
      const keep = state.settings;
      commit({ ...freshState(now()), settings: { ...keep } });
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
  return store;
}
