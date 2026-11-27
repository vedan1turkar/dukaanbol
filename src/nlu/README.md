# src/nlu — owner: Aditya
`parse(transcript, alternatives, lang, store) → ParseResult` (see `src/contracts/types.ts`).
Numbers (digits + Marathi/Hindi/English words), intent keywords, product matching via `store.findProducts`, confidence rules, 15-vs-50 check across alternatives. Pure functions — unit-test them.
