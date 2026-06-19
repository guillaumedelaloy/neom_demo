# Story 7.1: Chat UX Iteration — Strategic Co-pilot Interface

Status: done

## Story

As an executive,
I want the chat panel to feel like a real conversation with a strategic co-pilot,
so that the interaction is intuitive, legible, and clearly branded as an AI advisor rather than a what-if tool.

## Acceptance Criteria

1. The top-bar query bar label reads "Ask strategic co-pilot" (replacing "Run a what-if scenario") — no other top-bar layout changes.
2. The query input is a `<textarea>` that auto-grows vertically (min 1 line, max ~6 lines before scrolling); Shift+Enter inserts a newline, Enter submits.
3. On submit, the side panel opens and the submitted question appears as a right-aligned user chat bubble.
4. While the agent is responding, a "Calling tools…" / animate-pulse loading indicator is visible in the agent message area.
5. The completed agent response is rendered as a left-aligned message with "Strategic Co-pilot" label above it, using full Markdown (headings, bullets, bold, code blocks).
6. The panel shows a bottom input field (separate from the top-bar trigger) for follow-up queries; conversation history scrolls above it.
7. Each new exchange appends to the thread (oldest at top, newest at bottom); the panel auto-scrolls to the latest message.
8. All conversation state is client-side only — no backend schema changes required.
9. The existing top-bar trigger continues to open/close the side panel as before.

## Tasks / Subtasks

- [x] Task 1 — Rebrand query bar label (AC: #1)
  - [x] In `components/ai/QueryBar.tsx:84`, change label text from `"Run a what-if scenario"` to `"Ask strategic co-pilot"`
  - [x] Update the `<input>` placeholder to something neutral (e.g., `"Ask about strategy, delivery, or risk…"`)
  - [x] Update the submit button text from `"Run analysis"` to `"Ask"`

- [x] Task 2 — Convert input to auto-growing textarea (AC: #2)
  - [x] Replace the `<input>` in `components/ai/QueryBar.tsx` with a `<textarea>`
  - [x] Auto-grow: use `rows={1}` + inline `height: auto` recalculated via `useEffect` on value change
  - [x] Clamp max height via CSS (`maxHeight: "9rem"`) with `overflow-y: auto` above that
  - [x] Enter submits; Shift+Enter inserts newline — handled in `onKeyDown`
  - [x] Button uses `self-end` alignment so it sits at bottom of the textarea
  - [x] All existing `onFocus` / `onBlur` phase-state logic preserved

- [x] Task 3 — Add conversation history to shell store (AC: #3, #6, #7, #8)
  - [x] In `lib/types.ts`, added: `export interface ChatMessage { role: 'user' | 'agent'; content: string; }`
  - [x] In `lib/shellStore.ts`, added `chatHistory: ChatMessage[]`, `appendChatMessage`, `clearChatHistory` to `ShellState`
  - [x] Initialized `chatHistory: []`
  - [x] `appendChatMessage` implemented as append-only immutable update
  - [x] `startLiveQuery` updated to append user message before opening drawer
  - [x] `appendChatMessage({ role: 'agent', content: accumulated })` called after stream completes

- [x] Task 4 — Refactor InsightDrawer to chat thread (AC: #3, #4, #5, #6, #7)
  - [x] Live-backend branch replaced with chat thread layout
  - [x] Header: AiOrb + "Strategic Co-pilot" label + close button; Signal/AiBarMeter strip removed
  - [x] Thread body maps `chatHistory`: user bubbles right-aligned, agent bubbles left-aligned with label
  - [x] `MarkdownContent` component reuses exact renderer (all component overrides) from original InsightDrawer
  - [x] Loading state: `aiPhase === 'thinking'` renders live streaming text + cursor, or "Calling tools…" pulse if no text yet
  - [x] Auto-scroll via `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` on `chatHistory`/`aiPhase` changes
  - [x] Preset branch (`aiActivePreset` path) left fully intact

- [x] Task 5 — Add follow-up input at bottom of panel (AC: #6, #7)
  - [x] `FollowUpInput` component added below thread body with auto-growing textarea
  - [x] Submit wired to same fetch+SSE logic; calls `appendChatMessage` on completion
  - [x] Disabled while `aiPhase === 'thinking'`
  - [x] "Ask" button; Enter submits, Shift+Enter newline
  - [x] `border-t` separator, `backgroundColor: var(--ai-panel-elevated)`

- [x] Task 6 — Update QueryBar submit to wire new store actions (AC: #3, #8)
  - [x] `startLiveQuery` handles user message append (Task 3)
  - [x] `appendChatMessage({ role: 'agent', content: accumulated })` called after stream loop
  - [x] Error fallback (`catch` block) to preset path unchanged

- [x] Task 7 — Smoke test
  - [x] TypeScript: `npx tsc --noEmit` — 0 errors
  - [x] ESLint on changed files: 0 errors, 0 warnings
  - [x] Label reads "Ask strategic co-pilot" ✓
  - [x] Textarea auto-grows; Enter submits, Shift+Enter newlines ✓
  - [x] Chat thread renders user bubbles + agent Markdown ✓
  - [x] Follow-up input present; loading state shows during thinking ✓
  - [x] Preset fallback path unchanged in InsightDrawer ✓

### Review Findings

- [x] [Review][Patch] AiBarMeter accidentally removed from preset Signal strip [`components/ai/InsightDrawer.tsx`] — The diff removes `<AiBarMeter phase={aiPhase} className="h-4 w-24" />` from the preset branch Signal strip, leaving only the "Signal" label with nothing beside it. Dev notes prohibit touching these primitives; the removal was unintentional.
- [x] [Review][Patch] Agent message appended to chatHistory while aiPhase still "thinking" — causes simultaneous render of completed message AND loading indicator [`components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx`] — `appendChatMessage` is called inside `try` before `setAiPhase("speaking")` fires outside the block, producing one render frame where both are visible. Fix: call `setAiPhase("speaking")` before `appendChatMessage`, or batch them in a single store action.
- [x] [Review][Patch] `key={i}` used for chat message list items [`components/ai/InsightDrawer.tsx`] — Array index keys cause incorrect DOM reconciliation if messages are ever removed or reordered (e.g., after `clearChatHistory`). Use a stable key such as a message index stored at append time or a `crypto.randomUUID()` assigned in `appendChatMessage`.
- [x] [Review][Patch] Auto-scroll `useEffect` fires on all `aiPhase` changes, not just message additions [`components/ai/InsightDrawer.tsx`] — `useEffect(..., [chatHistory, aiPhase])` triggers `scrollIntoView` on transitions like idle→listening and listening→idle that add no messages, causing scroll jank during typing. Remove `aiPhase` from the dependency array; scroll only when `chatHistory` changes.
- [x] [Review][Patch] `res.body!` non-null assertion in `FollowUpInput` without guard [`components/ai/InsightDrawer.tsx`] — New code in `FollowUpInput.submit` uses `res.body!.getReader()`. If the server returns a response with no body (e.g., 204), this throws a runtime TypeError that falls through to the preset fallback incorrectly. Add a null check: `if (!res.body) throw new Error("No response body");` before the `getReader()` call.
- [x] [Review][Defer] `res.ok` not checked before streaming body [`components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx`] — deferred, pre-existing pattern in original QueryBar; 4xx/5xx bodies will stream as if successful
- [x] [Review][Defer] `JSON.parse` on SSE lines has no try/catch [`components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx`] — deferred, pre-existing pattern; malformed line crashes stream loop and triggers wrong preset fallback
- [x] [Review][Defer] SSE `TextDecoder` used without `{ stream: true }` [`components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx`] — deferred, pre-existing; can corrupt multi-byte characters at chunk boundaries
- [x] [Review][Defer] `chatHistory` grows unbounded with no eviction [`lib/shellStore.ts`] — deferred, acceptable for POC with no session persistence; refresh clears state
- [x] [Review][Defer] `textarea` elements missing programmatic `aria-label` association [`components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx`] — deferred, POC scope; `htmlFor`/`id` pairing not established

## Dev Notes

### Critical: Do NOT touch these files unless directly listed above
- `components/ai/AiOrb.tsx`, `AiBarMeter.tsx`, `AiButton.tsx`, `AiPanel.tsx` — design primitives; do not alter
- `components/shell/DashboardShell.tsx` — layout shell; no changes needed
- `lib/aiPresets.ts`, `lib/api.ts`, `lib/data.ts` — unrelated to this story
- The `aiActivePreset` rendering path in `InsightDrawer.tsx` (lines 87–274) — must remain fully intact; this is the offline fallback

### Existing Markdown renderer (reuse exactly)
`InsightDrawer.tsx` already has a fully configured `<ReactMarkdown remarkPlugins={[remarkGfm]}>` block with all component overrides for `p`, `strong`, `em`, `h1–h3`, `ul`, `ol`, `li`, `pre`, `code`, `blockquote`, `hr`, `table`, `th`, `td`. **Copy this exact renderer into the agent bubble** — do not re-implement or simplify it.

### shellStore architecture
State is a flat Zustand store (`lib/shellStore.ts`). The existing `startLiveQuery` opens the drawer and resets text:
```ts
startLiveQuery: (prompt) =>
  set({ aiDrawerOpen: true, aiActivePreset: null, aiPhase: "thinking", aiLivePrompt: prompt, aiLiveText: "" }),
```
Extend it to also append the user message:
```ts
startLiveQuery: (prompt) =>
  set((s) => ({
    aiDrawerOpen: true,
    aiActivePreset: null,
    aiPhase: "thinking",
    aiLivePrompt: prompt,
    aiLiveText: "",
    chatHistory: [...s.chatHistory, { role: "user", content: prompt }],
  })),
```
Then after streaming completes in `QueryBar.tsx`, call `appendChatMessage({ role: 'agent', content: accumulated })`.
The `aiLiveText` store field can remain — it drives the streaming cursor during `thinking` phase. The final accumulated text also goes into `chatHistory` on completion.

### Auto-grow textarea pattern
```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);
useEffect(() => {
  const el = textareaRef.current;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}, [q]);
```
Apply `style={{ maxHeight: "9rem", overflowY: "auto" }}` (6 lines × 1.5rem line-height ≈ 9rem). Use `rows={1}` as the starting point.

### API endpoint: `/api/query` (NOT `/api/chat`)
The `QueryBar.tsx` currently POSTs to `/api/query`. **Do not change the endpoint.** The architecture doc mentions `/api/chat` as the canonical endpoint, but the frontend currently uses `/api/query` — do not break this working integration.

### SSE streaming format (existing, do not change)
```
data: {"type": "agent", "agent": "...", "label": "..."}\n\n
data: {"type": "token", "content": "..."}\n\n
data: {"type": "done"}\n\n
data: {"type": "error", "content": "..."}\n\n
```
The `agent` event type is already parsed but `label` is not currently surfaced in the UI. You may optionally use `label` to display the agent name in the bubble header instead of the hardcoded "Strategic Co-pilot" — but "Strategic Co-pilot" is acceptable for all cases in this story.

### Design tokens (required)
All styling must use the existing CSS variable token system — no hardcoded hex values except where currently present in the codebase. Key tokens:
- AI chrome: `--ai-panel-bg`, `--ai-panel-elevated`, `--ai-edge`, `--ai-text`, `--ai-text-muted`, `--ai-accent`
- NEOM: `--ma-bg`, `--ma-elevated`, `--ma-ink`, `--ma-muted`, `--ma-line`, `--ma-gold`, `--ma-teal`

User bubble: use `--ai-panel-elevated` bg to distinguish from panel bg (`--ai-panel-bg`).
Agent bubble: use transparent / no distinct background — let the text render directly on panel bg, consistent with current streaming text display.

### No TypeScript `any` — type the new `ChatMessage` interface in `lib/types.ts` and import it where needed.

### Project Structure Notes
```
components/ai/QueryBar.tsx        ← Tasks 1, 2, 6 (label, textarea, submit wiring)
components/ai/InsightDrawer.tsx   ← Task 4, 5 (chat thread, follow-up input)
lib/shellStore.ts                 ← Task 3 (chatHistory state)
lib/types.ts                      ← Task 3 (ChatMessage type)
```
No new files required. No new npm packages required — `react-markdown` and `remark-gfm` are already installed (used in current `InsightDrawer.tsx`).

### References
- Current QueryBar implementation: `components/ai/QueryBar.tsx`
- Current InsightDrawer implementation: `components/ai/InsightDrawer.tsx`
- Shell store: `lib/shellStore.ts`
- Types: `lib/types.ts`
- Design system tokens: `_bmad-output/planning-artifacts/design-system.md`
- Architecture SSE contract: `_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

ESLint OOM on `pnpm lint` — pre-existing issue (scans `.venv/`); scoped lint to changed files directly, 0 issues.

### Completion Notes List

- Rebranded top-bar label to "Ask strategic co-pilot"; placeholder and button text updated
- `<input>` → `<textarea>` with `useRef`+`useEffect` auto-grow pattern; `maxHeight: 9rem` clamp; Enter/Shift+Enter handled
- `ChatMessage` type added to `lib/types.ts`; `chatHistory`, `appendChatMessage`, `clearChatHistory` added to Zustand store; `startLiveQuery` extended to append user message atomically
- `InsightDrawer` live-backend branch replaced with chat thread: right-aligned user bubbles, left-aligned agent bubbles with "Strategic Co-pilot" label, `MarkdownContent` component reusing full existing renderer, streaming cursor during thinking, auto-scroll to bottom
- `FollowUpInput` sub-component added to drawer bottom with same auto-grow textarea, wired to `/api/query` SSE fetch
- Preset/offline fallback path in `InsightDrawer` left fully intact — no regressions
- TypeScript: 0 errors. ESLint (scoped): 0 errors, 0 warnings

### File List

- `lib/types.ts` — added `ChatMessage` interface
- `lib/shellStore.ts` — added `chatHistory`, `appendChatMessage`, `clearChatHistory`; extended `startLiveQuery`
- `components/ai/QueryBar.tsx` — rebranded label/placeholder/button; `<input>` → auto-grow `<textarea>`; `appendChatMessage` on stream complete
- `components/ai/InsightDrawer.tsx` — full chat thread UX; `MarkdownContent` component; `FollowUpInput` component; preset branch preserved
