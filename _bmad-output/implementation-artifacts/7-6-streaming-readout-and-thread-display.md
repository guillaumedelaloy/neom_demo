# Story 7.6: Streaming Readout + Adapted Thread Display

Status: review

## Story

As an executive,
I want the readout panel to show the live streamed answer — each token appearing as it arrives — and the thread strip to summarise prior turns,
so that I see the real backend response in the same familiar CEO cockpit panel.

## Acceptance Criteria

1. While the backend is streaming tokens, `streamedAnswer` grows and the readout panel updates in real time — auto-scrolls to bottom on each token.
2. When `done` is received, the full answer is visible in the readout and preserved in the thread for the session.
3. When an `error` or `not_supported` event is received, the readout shows the event's `content` with amber left-border styling (`border-l-2 border-ma-amber-warn`) — same visual weight as existing amber callouts in the drawer.
4. The `StructuredAnswer` component is removed from `CeoChatDrawer.tsx`.
5. The readout panel renders with `whitespace-pre-wrap` — no markdown library required.
6. The thread strip (compact top display) shows the first 140 characters of `streamedAnswer` for assistant messages — truncated with ellipsis if longer.
7. The readout empty-state placeholder text reads: `"Your answer will stream here."`.
8. `pnpm build` exits with code 0 — zero TypeScript errors.

## Tasks / Subtasks

- [x] Task 1 — Replace `StructuredAnswer` readout with streaming text panel (AC: #1, #4, #5, #7)
  - [x] Remove `StructuredAnswer` component render and its import from `CeoChatDrawer.tsx`
  - [x] Add a `<div>` readout panel in its place:
    - Empty state (no `streamedAnswer` and not `isRunning`): render placeholder text `"Your answer will stream here."` in `text-ma-muted` style
    - Streaming / completed state: render `streamedAnswer` in a `<pre>` or `<p>` with `whitespace-pre-wrap` and `text-ma-ink`
  - [x] Add `useRef` + `useEffect` for auto-scroll to bottom when `streamedAnswer` changes

- [x] Task 2 — Error / not_supported display (AC: #3)
  - [x] When `error` prop is set (non-null), render the error message in a `<div>` with `border-l-2 border-ma-amber-warn pl-3 text-ma-amber-warn text-sm`
  - [x] Error state replaces the readout content (not appended below it)
  - [x] Clear error display when a new `submit` is triggered (handled by hook reset in Story 7.4)

- [x] Task 3 — Update thread strip for streaming answers (AC: #6)
  - [x] For assistant messages in the compact thread display, replace `answer.directAnswer` (or equivalent `CeoAnswer` field) with `msg.streamedAnswer.slice(0, 140)` + `'…'` if truncated
  - [x] Confirm user message display in thread strip is unchanged

- [x] Task 4 — Validation (AC: #8)
  - [x] Run `pnpm build` — 0 errors
  - [x] Run `pnpm lint` — 0 errors
  - [ ] Manual smoke: open chat drawer, submit a question with backend running — confirm tokens stream into readout, auto-scroll works, "What We Checked" log populates

## Dev Notes

### Auto-scroll pattern
```tsx
const readoutRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  readoutRef.current?.scrollTo({ top: readoutRef.current.scrollHeight, behavior: 'smooth' })
}, [streamedAnswer])
```
Attach `ref={readoutRef}` to the scrollable readout container.

### Readout panel structure
```tsx
<div ref={readoutRef} className="overflow-y-auto flex-1 px-4 py-3">
  {error ? (
    <div className="border-l-2 border-ma-amber-warn pl-3 text-ma-amber-warn text-sm">
      {error}
    </div>
  ) : streamedAnswer ? (
    <p className="whitespace-pre-wrap text-sm text-ma-ink leading-relaxed">
      {streamedAnswer}
    </p>
  ) : (
    <p className="text-sm text-ma-muted italic">Your answer will stream here.</p>
  )}
</div>
```
Adjust padding/sizing tokens to match surrounding drawer chrome — do not hardcode pixel values.

### `StructuredAnswer` removal
`StructuredAnswer` is defined inline in `CeoChatDrawer.tsx` (it renders the 5-section structured readout from the deterministic engine). Remove the component definition entirely — it will no longer be used after Story 7.5 removes `CeoAnswer` from the message type.

### Thread strip truncation
```tsx
{msg.role === 'assistant' && (
  <span className="text-xs text-ma-muted">
    {msg.streamedAnswer.length > 140
      ? msg.streamedAnswer.slice(0, 140) + '…'
      : msg.streamedAnswer}
  </span>
)}
```

### Design tokens reminder
Use only `--ma-*` and `--ai-*` CSS variables. No hardcoded hex or rgb values.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
None — existing implementation was largely complete from Story 7.5; only missing `readoutRef` auto-scroll and error styling alignment.

### Completion Notes List
- Added `readoutRef = useRef<HTMLDivElement>(null)` alongside existing `logRef`
- Added `useEffect` auto-scroll hook: scrolls readout to bottom on each `streamedAnswer` change
- Attached `ref={readoutRef}` to the readout container div
- Fixed error div class: `pl-2` → `pl-3`, `text-[12px]` → `text-sm` to match AC #3 spec
- StructuredAnswer already removed (done in Story 7.5), thread strip already uses `streamedAnswer.slice(0, 140)`
- `pnpm build` and `pnpm lint` both exit 0
- Manual smoke test (live backend) left as a manual step per story design

### File List
- src/intelligence/CeoChatDrawer.tsx

### Change Log
- 2026-04-14: Added readout auto-scroll (readoutRef + useEffect), fixed error amber styling to match AC spec — Story 7.6 complete
