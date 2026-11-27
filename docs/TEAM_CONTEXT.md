# DukaanBol — Team Context & Handoff

> **For:** Vedant + Aditya. Read this fully before writing any code.
> **Also read:** `DukaanBol.md` (the original brief, sections 2.3–2.10 are the detailed requirements).
> **Last updated:** 27 Nov 2026 (night). Nothing coded yet — see "Current status" at the bottom.

---

## 1. What we are building (in one paragraph)

**DukaanBol** is a voice-first inventory and procurement assistant for small kirana stores in Maharashtra. The shopkeeper presses a mic button and speaks in **Marathi, Hindi or Hinglish** to record sales, record stock arrivals, check stock and expiry, and get reorder suggestions. Given a budget ("माझा आजचा budget 3000 रुपये आहे"), an agent prepares a **supplier-wise purchase order within budget** that the owner must **approve**. Nothing is ever ordered automatically. Every stock-changing action is **confirmed before saving** and can be **undone**, so a misheard word never silently corrupts inventory.

---

## 2. Hackathon rules (from the submission page)

- **Round 2, theme:** Livelihoods and small business. "Build a working voice-first prototype for India. One core flow that works end to end. Not a full product."
- **Deadline: 30 Nov, 11:59 pm. One submission per team, can submit only once.**
- We must submit:
  1. **Code on GitHub** — public, and **must start without any secret keys**.
  2. **YouTube demo** — public or unlisted, **max 3 minutes**, showing the product working.
  3. **Pitch deck (PDF)** — problem, users, what it depends on, launch plan.
  4. **Live link** — optional bonus *if it works*. We are doing it.

---

## 3. The one journey that MUST work (definition of done)

1. Shopkeeper says: "आज 10 Parle-G चे packets विकले."
2. App shows: Sale · Parle-G · 10 packets → **Confirm / Edit / Cancel**, and speaks "10 Parle-G packets विकले, बरोबर?"
3. On confirm, stock updates, undo is offered.
4. App detects a shortage (e.g. Maggi low) and an expiry risk (e.g. Parle-G batch expiring in 5 days).
5. Shopkeeper says the budget → agent builds a budget-checked, supplier-wise purchase order, shows deferred items if over budget.
6. Owner taps **Approve** → saved as "Approved PO (not sent to distributor — prototype)".

If we're short on time, everything else is secondary to this.

---

## 4. Tech decisions (already agreed — don't change without discussing)

| Decision | Why |
|---|---|
| **Vite + React + TypeScript + Tailwind** | Fast to build, static deploy |
| **No backend server.** All logic runs in the browser; data in `localStorage`, loaded from seed data, with a "Reset demo" button | Live link is trivial, nothing to keep running |
| **Speech-to-text: browser Web Speech API** (`mr-IN`, `hi-IN`, `en-IN`), request `maxAlternatives = 5` | Free, **no API keys** (rule: repo must run without secrets) |
| **Text-to-speech: browser `speechSynthesis`** | Free. Marathi voices often missing → fall back to Hindi voice; reply is always also shown on screen |
| **Language understanding: rule-based parser** (keywords + number words + alias/fuzzy product matching) | Deterministic, testable, no keys. Optional LLM only behind an env var, never required |
| **All stock / reorder / budget maths in pure TypeScript (`src/domain/`) with Vitest tests** | Brief requires deterministic calculations; AI only for language |
| **Deploy: Vercel**, auto-deploy from `main`, preview link per PR | HTTPS needed for mic; live link always up |
| **Supported browsers: Chrome / Edge (Android + desktop).** Others get a banner + typed input | Web Speech API support |
| **Typed input always available** | This is also the required manual fallback |

---

## 5. Who does what

The app splits at one seam: **Aditya turns speech into an `Intent`; Vedant executes the `Intent`.**

### Aditya — Voice & conversation
**Owns:** `src/voice/`, `src/nlu/`, `src/i18n/`, `src/screens/VoiceHome/`, `src/components/ConfirmCard/`

- Push-to-talk mic (never listen continuously), recording indicator, live + final transcript
- Number parsing: digits + Marathi (दहा, पंधरा, पन्नास…), Hindi (दस, पंद्रह, पचास…), English
- Intent detection (keywords): sale (विकले, बेचे, sold), arrival (आले, आया, add करा), stock check (किती, कितना, बाकी), expiry (expire), reorder (order करायला, मंगवाना), budget (budget + रुपये), undo/cancel/edit (undo, cancel, मागचा, quantity बदलायची)
- Product matching: aliases (Devanagari + Latin) + fuzzy match; ask user to choose if several match; never silently pick
- Confidence rules with configurable thresholds: high → confirm card; medium → one targeted question; low → "आवाज नीट ऐकू आला नाही. कृपया पुन्हा बोला." + manual entry
- **15 vs 50 rule:** if speech alternatives disagree on quantity → "तुम्ही 15 packets म्हणालात की 50?" with two buttons. Never update until clarified
- Missing info → ask one question at a time ("कोणता product आला?" → "किती quantity आली?")
- Expiry question after arrival ("या batch ची expiry date काय आहे?") — spoken or date picker; never invent a date
- Confirm / Edit / Cancel card, undo toast, spoken replies in the chosen language
- Language picker strings + reply templates (Marathi, Hindi, Hinglish)
- Tests: `tests/test-phrases.md` (~30 phrases across 3 languages) + parser unit tests

**Must not:** read/write `localStorage` or stock directly. Everything goes through the `DukaanStore` interface.

### Vedant — Data, logic, agent & other screens
**Owns:** `src/domain/`, `src/store/`, `src/seed/`, all `src/screens/` except VoiceHome

- Data model: Product, Batch, LedgerEntry
- **Append-only ledger.** Stock is derived from the ledger. Undo/edit = a new correction entry pointing to the original; never erase
- **No negative stock:** refuse and say how much is actually there
- Expiry: batches expiring within N days
- Reorder: target = avg daily sales × (lead time + cover days) − current − incoming; if little history, use owner's min threshold and mark **"limited data"**
- Procurement agent: rank by urgency (days of stock left) × importance, fill budget greedily, trim quantities, list **deferred items**, group by supplier. Show agent steps on screen (budget saved → N items need restock → quantities → prices → over budget, trimmed → order ready)
- Purchase order + approval (Approve / Edit / Reject). Approved PO is saved as a record — never pretend a distributor received it
- Seed data: ~12 products (Parle-G, Maggi, Amul Milk, Tata Salt, …), 14 days of sales history, suppliers, batches. Demo setup: Maggi = 18 (low), a Parle-G batch expiring in 5 days
- Screens: Onboarding (shop name, language, budget), Inventory, Product Detail, Alerts, Procurement, Approval, History
- Tests: Vitest for negative stock, undo, reorder, budget trimming, deferred items

**Must not:** parse raw text. Vedant's code only receives `Intent` objects.

---

## 6. The contract between us (DRAFT — confirm together tomorrow morning, then freeze)

Will live in `src/contracts/`. After the morning sync, **changes only via a small PR approved by both.**

```ts
// src/contracts/types.ts
export type Lang = 'mr' | 'hi' | 'hinglish';
export type Unit = 'packet' | 'kg' | 'litre' | 'piece' | 'box';

export interface Product {
  id: string;
  name: string;               // "Parle-G"
  aliases: string[];          // ["पार्ले जी", "parle g", "पारले"]
  unit: Unit;
  category?: string;
  minStock: number;
  costPrice?: number;
  sellPrice?: number;
  supplierId?: string;
  leadTimeDays?: number;
  importance: 1 | 2 | 3;      // owner-set, 3 = most important
}

export interface Batch {
  id: string;
  productId: string;
  qty: number;
  expiryDate?: string;        // ISO date; never invented
  batchNo?: string;
}

export type LedgerType = 'sale' | 'arrival' | 'damage' | 'correction';
export interface LedgerEntry {
  id: string;
  type: LedgerType;
  productId: string;
  qtyDelta: number;           // sale = negative, arrival = positive
  at: string;                 // ISO timestamp
  source: 'voice' | 'manual';
  transcript?: string;
  correctsEntryId?: string;   // for undo/edit
  batchId?: string;
}

export type Intent =
  | { kind: 'sale'; productId: string; qty: number }
  | { kind: 'arrival'; productId: string; qty: number; expiryDate?: string; supplierId?: string }
  | { kind: 'stock_check'; productId: string }
  | { kind: 'expiry_check'; withinDays?: number }
  | { kind: 'reorder' }
  | { kind: 'set_budget'; amount: number }
  | { kind: 'undo' }
  | { kind: 'edit_qty'; entryId: string; newQty: number };

export type Confidence = 'high' | 'medium' | 'low';

export interface ParseResult {
  transcript: string;
  intent?: Intent;                 // only set when complete and unambiguous
  confidence: Confidence;
  clarify?: {                      // ask ONE question
    question: string;              // already in user's language
    choices?: { label: string; value: unknown }[];
    missing?: 'product' | 'qty' | 'expiry' | 'unit';
  };
  unknownProductName?: string;     // → offer "add new product"
}

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
```

```ts
// src/contracts/store.ts
export interface DukaanStore {
  // reads (no confirmation needed)
  listProducts(): Product[];
  findProducts(query: string): Product[];
  getStock(productId: string): number;
  getExpiring(withinDays: number): { product: Product; batch: Batch }[];
  getLowStock(): Product[];
  getHistory(filter?: { type?: LedgerType }): LedgerEntry[];

  // writes (call ONLY after user confirmed)
  recordSale(productId: string, qty: number, meta?: Partial<LedgerEntry>): Result<LedgerEntry>;
  recordArrival(productId: string, qty: number, opts?: { expiryDate?: string; supplierId?: string }): Result<LedgerEntry>;
  undoLast(): Result<LedgerEntry>;
  correct(entryId: string, newQty: number): Result<LedgerEntry>;
  addProduct(p: Omit<Product, 'id'>, openingQty: number): Result<Product>;  // rejects duplicates

  // procurement
  setBudget(amount: number): void;
  recommend(): Recommendation[];
  buildPurchaseOrder(budget: number): PurchaseOrderDraft;   // includes agent steps + deferred items
  approvePO(draft: PurchaseOrderDraft): Result<ApprovedPO>;
}
```

`Recommendation`, `PurchaseOrderDraft`, `ApprovedPO` — Vedant defines these in the morning before freezing.

Errors come back as `{ ok: false, reason }`, **never thrown**. Aditya's UI speaks/shows `reason`.

`src/store/mockStore.ts` returns fixed answers, so Aditya can build the full voice loop on Day 1 without waiting for Vedant's code. Switching to the real store is a one-line change.

---

## 7. Folder layout

```
src/
  contracts/      SHARED — frozen after morning sync
  domain/         Vedant — pure logic
  store/          Vedant — real store + mockStore
  seed/           Vedant
  voice/          Aditya
  nlu/            Aditya
  i18n/           Aditya
  components/ConfirmCard/   Aditya
  screens/VoiceHome/        Aditya
  screens/*                 Vedant (everything else)
  App.tsx         SHARED — routing only, change via small PR
tests/
  test-phrases.md  Aditya
```

---

## 8. Git rules (this is what keeps the merge stable)

1. **Never commit directly to `main`.** Branch names: `aditya/<topic>`, `vedant/<topic>`.
2. **Small PRs, merged at least twice a day.** Don't sit on a branch all day.
3. **CI must pass** (typecheck + tests + build) before merge.
4. **Test on the Vercel preview link** of your PR before merging — so the live link never breaks.
5. **Only touch your own folders.** Shared files (`contracts/`, `App.tsx`, `package.json`) change only in their own tiny PR, after telling the other person.
6. Pull `main` before starting each new branch.

---

## 9. Timeline

> Aditya starts on **28 Nov**, so the 2 build days are **28 and 29 Nov**, and **30 Nov** is submission day.

| When | What |
|---|---|
| **27 Nov night** | Vedant (+ Claude): scaffold repo, contracts draft, mockStore, app shell, CI, first Vercel deploy |
| **28 Nov, morning (15 min sync)** | Aditya reads this file + `contracts/`. Fix anything that doesn't work for the voice side. **Freeze contracts.** |
| 28 Nov, 1 pm | Checkpoint: Aditya's voice loop works on mockStore; Vedant's domain tests pass |
| **28 Nov, 7 pm** | **Checkpoint: swap mock → real store.** Do voice sale → confirm → stock changes → undo together, on a phone |
| 29 Nov, 1 pm | Checkpoint: budget voice → agent → Approval screen; expiry + reorder from real data |
| **29 Nov, 8 pm** | **Code freeze.** Both run the full journey (section 3) on the live link. Only bug fixes after this |
| **30 Nov** | Vedant: pitch deck PDF. Aditya: record ≤3 min demo video. Review each other's. Fresh-clone test (runs with no `.env`), incognito test of live link. **Submit before 11:59 pm** |

### Demo video outline (≤ 3 min)
Onboarding (15s) → Marathi sale + confirm + undo (40s) → Hindi arrival + expiry question (30s) → error case, 15 vs 50 (20s) → expiry alert (15s) → budget → agent steps → reduced order → approve (50s) → history (10s).

### Pitch deck must cover
Problem, users, how it works, trust design (confirm/undo/manual), what it depends on (Web Speech API accuracy, Chrome, smartphone, no distributor integration yet), impact case (section 4 of brief — label numbers as assumptions), launch plan (8-week pilot, 50–100 Maharashtra stores, metrics from brief).

---

## 10. Do NOT build (brief says "later — don't simulate as working")
Invoice scanning · festival forecasting · distributor integrations · joint purchases · advanced supplier price comparison · payments / customer credit.

---

## 11. Known risks
- **Marathi speech accuracy in Chrome is uneven** → aliases + confirm card + typed input.
- **Marathi TTS voice often missing** → Hindi voice fallback, reply always on screen.
- **Mic needs HTTPS + permission** → live link is HTTPS; test on a real Android phone on Day 1.

---

## 12. Current status (update this section as we go)

- [ ] GitHub repo created (public) — link: _TBD_
- [ ] Vercel connected — live link: _TBD_
- [x] Scaffold + app shell + CI (27 Nov night) — Vite/React/TS/Tailwind/Vitest, router, bottom nav, 8 placeholder screens marked with owner + TODO
- [x] `src/contracts/types.ts` + `src/contracts/store.ts` drafted (includes Recommendation, PurchaseOrderDraft, ApprovedPO, ShopSettings)
- [x] `src/store/mockStore.ts` + 7 contract tests passing; `src/store/index.ts` is the one-line mock → real switch
- [x] Seed data: 12 products with Marathi/Hindi aliases, 3 suppliers, 14 days sales, Maggi = 18 (low), Parle-G batch expiring in 5 days
- [x] Onboarding screen works (shop name, language, budget)
- [ ] Morning sync done, contracts frozen

### How Aditya starts (28 Nov)
```bash
git clone <repo-url> && cd dukaanbol
npm install
npm run dev        # open http://localhost:5173 in Chrome
npm test
git checkout -b aditya/voice-mic
```
Start in `src/voice/`, `src/nlu/`, `src/screens/VoiceHome/VoiceHome.tsx`. Import the store with `import { store } from '../../store'`.
