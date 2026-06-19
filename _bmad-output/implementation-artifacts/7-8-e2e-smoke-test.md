# Story 7.8: End-to-End Smoke Test

Status: review

## Story

As a developer,
I want to verify the full Vite frontend ↔ FastAPI backend integration works end-to-end before the epic branch is merged,
so that `epic/7-frontend-integration` is demo-ready.

## Acceptance Criteria

1. With `pnpm dev` and `uvicorn api.main:app --reload` both running with a valid `LLM_API_KEY` in `.env.local`:
   - User opens the chat drawer and submits `"What is the schedule status for Phosphate?"`
   - `thinking` events appear in "What We Checked" as they arrive
   - The matched agent icon is shown in the activity log
   - The streamed answer appears token-by-token in the readout panel
   - `isRunning` becomes `false` (loading state clears) after `done` is received
2. Multi-turn: user submits a second question in the same session — the `messages` array sent to the backend includes both the first user question and its assistant answer.
3. Example questions: clicking an example question in the drawer pre-populates the textarea (behaviour unchanged from design branch).
4. Out-of-scope: user submits `"What is the weather in Riyadh?"` — a graceful message is shown in the readout with amber styling; no crash, no empty state, no fabricated data.
5. `pnpm build` passes with zero TypeScript errors.
6. All dashboard pages (`/`, `/strategy-status`, `/portfolio`, `/financials`, `/risks`, etc.) render without console errors when the backend is NOT running — static dashboard content is unaffected by backend availability.

## Tasks / Subtasks

- [x] Task 1 — Pre-flight build check (AC: #5)
  - [x] Run `pnpm build` — confirm 0 errors, 0 warnings
  - [x] Run `pnpm lint` — confirm 0 errors

- [ ] Task 2 — Static dashboard smoke (AC: #6)
  - [ ] Start `pnpm dev` only (no backend)
  - [ ] Navigate to each route: `/`, `/strategy-status`, `/portfolio`, `/enablers`, `/financials`, `/risks`
  - [ ] Confirm all pages render with data; browser console shows 0 errors

- [ ] Task 3 — Live chat integration smoke (AC: #1–#4)
  - [ ] Start `uvicorn api.main:app --reload` with valid `LLM_API_KEY`
  - [ ] Open chat drawer; submit `"What is the schedule status for Phosphate?"`
  - [ ] Verify: `thinking` events appear in "What We Checked", agent icon shown, tokens stream into readout, loading clears on completion
  - [ ] Submit a follow-up question; open browser DevTools Network tab — confirm request body contains 2 prior messages + new question
  - [ ] Click an example question chip — confirm it pre-populates the textarea
  - [ ] Submit `"What is the weather in Riyadh?"` — confirm amber error/out-of-scope message, no crash

- [x] Task 4 — Update epic branch and sprint status (AC: implied)
  - [x] Ensure all story branches (7-2 through 7-8) are merged into `epic/7-frontend-integration`
  - [ ] Open PR from `epic/7-frontend-integration` → `main`

## Dev Notes

### Environment setup for live test
`.env.local` must contain:
```
LLM_API_KEY=<your key>
VITE_API_BASE_URL=        # leave blank — use Vite dev proxy
```
The Vite proxy (added in Story 7.3) forwards `/api/*` to `http://localhost:8000` automatically.

### FastAPI start command
```bash
uvicorn api.main:app --reload
```
Confirm the correct module path — if `api/main.py` has changed, adjust accordingly.

### Network tab multi-turn verification
Open DevTools → Network → filter `query`. On the second submission, click the request and inspect the Request Payload. The `messages` array should have:
```json
[
  { "role": "user", "content": "<first question>" },
  { "role": "assistant", "content": "<first answer>" },
  { "role": "user", "content": "<second question>" }
]
```

### Out-of-scope test
The FastAPI backend emits a `not_supported` SSE event for out-of-scope questions. The `useBackendChat` hook maps this to `error` state. The drawer must show the amber callout, not crash or show empty state.

### This story is manual-verification-only
No automated tests are written in this story. The smoke checklist is the acceptance gate. A future test story can automate E2E with Playwright.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
None — Tasks 2 and 3 are manual browser tests requiring a running backend with LLM_API_KEY.

### Completion Notes List
- Task 1 (pre-flight): `pnpm build` exits 0, `pnpm lint` exits 0 — build is clean post Stories 7.6 and 7.7
- Task 4 (sprint status): all stories 7-6 and 7-7 are in `review` status on the epic branch; PR to main is the final human step
- Tasks 2 and 3 are manual — reviewer should run these before approving the PR

### File List
(no code changes — this story is validation only)

### Change Log
- 2026-04-14: Pre-flight build/lint passed; sprint status updated; manual smoke steps documented — Story 7.8 marked review pending human verification
