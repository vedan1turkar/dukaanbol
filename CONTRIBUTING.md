# Working together (Vedant + Aditya)

Full context: `docs/TEAM_CONTEXT.md`. Read it first.

## Ownership
| Folder | Owner |
|---|---|
| `src/contracts/` | **SHARED — frozen.** Change only by a small PR both approve |
| `src/App.tsx`, `package.json` | SHARED — small PR, tell the other person |
| `src/voice/`, `src/nlu/`, `src/i18n/`, `src/components/ConfirmCard/`, `src/screens/VoiceHome/`, `tests/test-phrases.md` | Aditya |
| `src/domain/`, `src/store/`, `src/seed/`, all other `src/screens/` | Vedant |

**The seam:** voice/NLU produces an `Intent`. The store executes it. Voice code never touches localStorage or stock directly; domain code never parses raw text.

## Git rules
1. Never commit to `main` directly. Branch: `aditya/<topic>` or `vedant/<topic>`.
2. Small PRs, merge at least twice a day. `git pull origin main` before each new branch.
3. CI (typecheck + tests + build) must be green before merge.
4. Check the Vercel preview link on the PR before merging — the live link must never break.
5. Errors are returned as `{ ok: false, reason }`, never thrown.

## Checkpoints
- 28 Nov 1 pm — voice loop works on mockStore; domain tests pass
- 28 Nov 7 pm — swap mock → real store in `src/store/index.ts`; test sale → confirm → undo together on a phone
- 29 Nov 1 pm — budget → agent → Approval works
- 29 Nov 8 pm — **code freeze**, only bug fixes after
- 30 Nov — deck + video, submit before 11:59 pm
