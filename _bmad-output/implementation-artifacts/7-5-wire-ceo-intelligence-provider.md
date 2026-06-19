# Story 7.5: Wire `CeoIntelligenceProvider` to the Real API

Status: review

## Story

As a developer,
I want `CeoIntelligenceProvider` to drive the chat from `useBackendChat` instead of `runCeoReasoning`,
so that all chat state flows from the live FastAPI backend with no local deterministic logic involved.

## Acceptance Criteria

1. `submitQuestion()` builds a `messages` array from all prior turns: each user message → `{ role: 'user', content: text }`, each prior assistant response → `{ role: 'assistant', content: streamedAnswer }`, new user message appended last.
2. `submitQuestion()` calls `submit(messages)` from `useBackendChat` — no call to `runCeoReasoning`.
3. `CeoChatDrawer` receives `activityLog`, `isRunning`, and `activeAgentId` directly from `useBackendChat` — not from separate local state.
4. `buildCeoDataSnapshot()` is removed from the provider.
5. `usePortfolioData()` and `useRiskData()` imports are removed from the provider (if not used elsewhere in the file).
6. `snapshot`, `lastAnswerRef`, and `reasoningSession` state/refs are removed.
7. `CeoIntelligenceProvider` is ≤100 lines after the change.
8. `pnpm build` exits with code 0 — zero TypeScript errors.
9. The chat drawer still opens and closes correctly; the draft input still works.

## Tasks / Subtasks

- [x] Task 1 — Integrate `useBackendChat` into `CeoIntelligenceProvider` (AC: #1–#6)
  - [x] Add `useBackendChat` import; call it at top of `CeoIntelligenceProvider`
  - [x] Rewrite `submitQuestion()` to build `messages` array from `messages` state (prior turns) and call `submit(messages)`
  - [x] Build prior-turn messages: `messages.flatMap(m => m.role === 'user' ? [{ role: 'user', content: m.text }] : [{ role: 'assistant', content: m.streamedAnswer }])`
  - [x] Remove `runCeoReasoning` call and its import
  - [x] Remove `buildCeoDataSnapshot` call and its import from `./orchestrate`
  - [x] Remove `usePortfolioData` and `useRiskData` imports and calls (verify neither is used elsewhere in the file)
  - [x] Remove `snapshot`, `lastAnswerRef`, `reasoningSession` state/ref declarations
  - [x] Remove `setReasoningSession` call from `submitQuestion`

- [x] Task 2 — Update message state shape for streaming (AC: #3)
  - [x] The `ChatMessage` type currently has `role: 'assistant'; answer: CeoAnswer`. Replace `answer: CeoAnswer` with `streamedAnswer: string` since the backend returns streaming text, not a structured `CeoAnswer`.
  - [x] Update `setMessages` call to append `{ id: uid(), role: 'assistant', streamedAnswer: '' }` — the `streamedAnswer` from the hook is passed to `CeoChatDrawer` directly (not stored per-message during streaming).
  - [x] On `done` event (when `isRunning` becomes false), append the completed `streamedAnswer` to `messages` so conversation history persists for multi-turn.

- [x] Task 3 — Pass hook state to `CeoChatDrawer` (AC: #3, #9)
  - [x] Pass `activityLog`, `isRunning`, `activeAgentId`, `streamedAnswer`, `error` from hook directly as props to `CeoChatDrawer`
  - [x] Remove any now-unused local state that `CeoChatDrawer` was previously reading from provider state

- [x] Task 4 — Validation (AC: #7, #8)
  - [x] Count lines in `CeoIntelligenceProvider.tsx` — must be ≤100
  - [x] Run `pnpm build` — 0 TypeScript errors
  - [x] Run `pnpm lint` — 0 errors

## Dev Notes

### Current `ChatMessage` type (design branch)
```ts
type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; answer: CeoAnswer }
```
Replace the assistant variant with:
```ts
  | { id: string; role: 'assistant'; streamedAnswer: string }
```
This aligns with the backend returning streaming markdown text instead of a structured `CeoAnswer` object.

### Multi-turn conversation history
The `messages` array grows with each turn. When building the `messages` payload for `submit()`:
```ts
const history = messages.map(m =>
  m.role === 'user'
    ? { role: 'user' as const, content: m.text }
    : { role: 'assistant' as const, content: m.streamedAnswer }
)
const payload = [...history, { role: 'user' as const, content: text }]
submit(payload)
```

### When to append the completed assistant message
Use a `useEffect` watching `isRunning`:
```ts
useEffect(() => {
  if (!isRunning && streamedAnswer) {
    setMessages(m => [...m, { id: uid(), role: 'assistant', streamedAnswer }])
  }
}, [isRunning])
```
This ensures the completed answer is stored in `messages` for the next turn's history payload.

### `orchestrate.ts` is NOT deleted in this story
Story 7.5 only removes the import and call in the provider. The file itself is deleted in Story 7.7 after all consumers are removed.

### `CeoContext` and `openChat`/`closeChat` are unchanged
The context value (`openChat`, `closeChat`, `setContext`, `context`, `isOpen`) is unaffected. Only the internal chat execution logic changes.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- `react-hooks/set-state-in-effect` (react-hooks v7 rule) blocked calling `setMessages` inside a `useEffect` body. Fixed by making `submit()` return `Promise<string | null>` (the completed answer) and making `submitQuestion` async — history append happens after `await submit()`, outside any effect.
- `useBackendChat.ts` updated accordingly: `submit` now tracks answer in a local `accumulated` variable and returns it on `done` event; `Promise<string | null>` return type added.

### Completion Notes List
- Rewrote `CeoIntelligenceProvider.tsx` to 100 lines (exactly at budget).
- Removed: `usePortfolioData`, `useRiskData`, `buildCeoDataSnapshot`, `runCeoReasoning`, `snapshot`, `lastAnswerRef`, `reasoningSession`, `setActivityLog`, `setIsRunning` — all replaced by `useBackendChat`.
- `ChatMessage` assistant variant changed from `answer: CeoAnswer` to `streamedAnswer: string` in both provider and `CeoChatDrawer`.
- `CeoChatDrawer` updated: removed `reasoningSession` prop, added `activeAgentId`/`streamedAnswer`/`error` props, removed `StructuredAnswer` component, updated thread display truncation, updated readout to use `streamedAnswer` prop directly.
- `pnpm build` → clean, `pnpm lint` → clean.

### File List
**Modified:**
- `src/intelligence/CeoIntelligenceProvider.tsx` — full rewrite to backend wiring (100 lines)
- `src/intelligence/CeoChatDrawer.tsx` — type updates, props update, StructuredAnswer removed
- `src/intelligence/useBackendChat.ts` — `submit` now returns `Promise<string | null>`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 7-5 status updated

### Change Log
- 2026-04-14: Wired `CeoIntelligenceProvider` to `useBackendChat`; removed all deterministic reasoning engine references; updated `CeoChatDrawer` props/types for streaming model.
