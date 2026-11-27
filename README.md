# DukaanBol 🎤🛒

Voice-first inventory and procurement assistant for kirana stores. Speak in **Marathi, Hindi or Hinglish** to record sales and stock arrivals, check stock and expiry, and get a budget-checked purchase order that the owner approves. Nothing is ordered automatically.

**Live:** _TBD_ · **Demo video:** _TBD_

## Run locally (no API keys needed)
```bash
npm install
npm run dev
```
Open in **Chrome or Edge** (Web Speech API). Microphone needs `localhost` or HTTPS.

```bash
npm test          # unit tests
npm run build     # typecheck + production build
```

## How it works
- **Speech → text:** browser Web Speech API (`mr-IN`, `hi-IN`, `en-IN`), push-to-talk only.
- **Text → intent:** rule-based parser (numbers in 3 languages, intent keywords, alias + fuzzy product matching, confidence rules).
- **Every stock change is confirmed before saving** and can be undone. The ledger is append-only.
- **Stock, reorder and budget maths** are deterministic TypeScript in `src/domain/`, with tests.
- **Data** lives in the browser (seeded demo shop, "Reset demo" available). No server.

## Not built (by design, for this prototype)
Invoice scanning · festival forecasting · distributor integrations · joint purchases · advanced price comparison · payments/credit. Approved orders are saved as records — they are **not** sent to any distributor.

## Team
See `CONTRIBUTING.md` and `docs/TEAM_CONTEXT.md`.
