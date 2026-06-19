# Story 3.8: Conversation History Context Passing

Status: ready-for-dev

## Story

As a user of the strategic co-pilot (web UI or CLI),
I want my follow-up questions to be answered in the context of the earlier conversation,
so that I can have a coherent multi-turn dialogue without having to repeat background from previous messages.

## Acceptance Criteria

1. When a follow-up question is submitted (via `FollowUpInput` in `InsightDrawer.tsx`), the full conversation history — all prior user messages and agent responses — is included in the `POST /api/query` request body, not just the new message.
2. When the top-bar query bar (`QueryBar.tsx`) is used after a prior exchange in the same session, the full conversation history is included in the request body.
3. The `messages` array sent to the backend uses the OpenAI-compatible format: `role: "user"` for user turns and `role: "assistant"` for agent turns (mapping from the store's `"agent"` role).
4. The `id` field from `ChatMessage` is stripped before sending — only `role` and `content` are included.
5. The CLI (`cli.py`) maintains a `history` list across the `chat()` loop and passes the full history to each `_stream_query` call, appending both user messages and agent responses after each turn.
6. The agent's responses refer back to earlier context (e.g., "as I mentioned above…") when the conversation warrants it — demonstrating that the backend is receiving and using the full history.
7. No backend changes are required — the backend's `stream_agent_response` already accepts and uses the full `messages` array.
8. No new npm packages or Python dependencies are required.

## Tasks / Subtasks

- [ ] T1 — Fix `QueryBar.tsx` submit to pass full history (AC: 1, 2, 3, 4)
  - [ ] T1.1: In `QueryBar.tsx`, destructure `chatHistory` from `useShellStore` alongside the existing store values
  - [ ] T1.2: In `submit()`, call `startLiveQuery(trimmed)` first (this appends the user message to `chatHistory`)
  - [ ] T1.3: After `startLiveQuery`, read `useShellStore.getState().chatHistory` to get the updated history (which now includes the new user message)
  - [ ] T1.4: Map chatHistory to API format: `chatHistory.map(({ role, content }) => ({ role: role === "agent" ? "assistant" : role, content }))` — strips `id`, maps `"agent"` → `"assistant"`
  - [ ] T1.5: Replace `body: JSON.stringify({ messages: [{ role: "user", content: trimmed }] })` with `body: JSON.stringify({ messages: apiMessages })` using the mapped array

- [ ] T2 — Fix `FollowUpInput` in `InsightDrawer.tsx` to pass full history (AC: 1, 3, 4)
  - [ ] T2.1: Add `chatHistory` to the destructured store values in `FollowUpInput`
  - [ ] T2.2: In `submit()`, apply the same pattern as T1 — read updated chatHistory after `startLiveQuery` and map to API format
  - [ ] T2.3: Replace the single-message `body` with the full mapped history array

- [ ] T3 — Add a `toChatApiMessages` helper to avoid duplication (AC: 3, 4)
  - [ ] T3.1: Add `export function toChatApiMessages(history: ChatMessage[]): { role: "user" | "assistant"; content: string }[]` to `lib/types.ts`
  - [ ] T3.2: Import and use in both `QueryBar.tsx` and `InsightDrawer.tsx`

- [ ] T4 — Fix `cli.py` to maintain and pass conversation history (AC: 5)
  - [ ] T4.1: In `chat()`, initialise `history: list[dict] = []` before the loop
  - [ ] T4.2: Before calling `_stream_query`, append `{"role": "user", "content": user_input}` to `history`
  - [ ] T4.3: Change `_stream_query` signature to accept `history: list[dict]` instead of `trimmed: str`
  - [ ] T4.4: Replace the hard-coded `[{"role": "user", "content": trimmed}]` body with `json.dumps({"messages": history})`
  - [ ] T4.5: After a successful response, append `{"role": "assistant", "content": accumulated}` to `history`

- [ ] T5 — Smoke test (AC: 6)
  - [ ] T5.1: `npx tsc --noEmit` — 0 errors
  - [ ] T5.2: ESLint on changed files: 0 errors, 0 warnings
  - [ ] T5.3: Web UI: ask "What is the phosphate BU status?", follow up with "Why is that?" — second response should reference context from the first
  - [ ] T5.4: CLI: same two-turn exchange via `python cli.py` — second response should reference context
  - [ ] T5.5: Verify first message from top-bar QueryBar still works correctly (no regression)

## Dev Notes

### Root Cause

`QueryBar.tsx` (line 44), `InsightDrawer.tsx` `FollowUpInput` (line 74), and `cli.py` (line 19) all hard-code a single-message array:

```ts
body: JSON.stringify({ messages: [{ role: "user", content: trimmed }] })
```

The backend (`api/services/agent_service.py`, `stream_agent_response`, line 94) does:

```python
history = [system_msg] + messages
```

It prepends the system prompt and passes the full `messages` array to LiteLLM. Multi-turn context was designed to work this way (Story 3.3 AC3), but the frontend never wired it up — it always sends a single-element array, so the LLM sees no prior context.

The `chatHistory` Zustand store already accumulates the full conversation (user + agent turns). The fix is purely mechanical: read the store and map it to the API format on each submission.

### Timing: `startLiveQuery` already appends the new user message

`startLiveQuery(prompt)` is a synchronous Zustand `set` — by the time the next line executes, `chatHistory` in the store already includes the new user message. So the fetch should happen **after** `startLiveQuery`, reading `useShellStore.getState().chatHistory` to get the complete, up-to-date array.

**Correct order:**
```ts
startLiveQuery(trimmed);                                        // 1. appends user msg, opens drawer
const apiMessages = toChatApiMessages(                          // 2. read updated state
  useShellStore.getState().chatHistory
);
const res = await fetch("/api/query", {
  body: JSON.stringify({ messages: apiMessages }),              // 3. send full history
  ...
});
```

### Role mapping

The store uses `role: "user" | "agent"` (see `lib/types.ts:4`). The backend and OpenAI format expect `role: "user" | "assistant"`. Map `"agent"` → `"assistant"`:

```ts
export function toChatApiMessages(history: ChatMessage[]) {
  return history.map(({ role, content }) => ({
    role: role === "agent" ? ("assistant" as const) : ("user" as const),
    content,
  }));
}
```

### `id` field

`ChatMessage` has an `id: string` field (stable key for React reconciliation). It must be stripped before sending — the backend ignores unknown fields but clean payloads are preferable. The destructure `({ role, content })` in the helper accomplishes this automatically.

### API key header

`QueryBar.tsx` sends `"x-api-key": process.env.NEXT_PUBLIC_BACKEND_API_KEY || ""` in the headers. `FollowUpInput` does not. This is a pre-existing inconsistency — do **not** fix it in this story (it would require investigation into the Next.js proxy setup). Keep headers exactly as they are in each component.

### Do NOT touch

- `api/services/agent_service.py` — no backend changes needed; it already uses the full messages array
- `api/routers/query.py` — no changes needed
- `lib/shellStore.ts` — no changes needed
- `components/ai/InsightDrawer.tsx` preset/offline path (lines 253–441) — untouched
- `components/ai/AiOrb.tsx`, `AiBarMeter.tsx`, `AiButton.tsx`, `AiPanel.tsx` — design primitives

### CLI fix pattern

```python
def chat() -> None:
    history: list[dict] = []
    while True:
        user_input = input("You: ").strip()
        ...
        history.append({"role": "user", "content": user_input})
        event_type, content = _stream_query(history)
        if event_type == "done":
            history.append({"role": "assistant", "content": content})
```

`_stream_query` receives the full list and sends `{"messages": history}`. No other changes needed — the backend contract is identical.

### Files to change

```
lib/types.ts                        ← T3.1: add toChatApiMessages helper
components/ai/QueryBar.tsx          ← T1: pass full history
components/ai/InsightDrawer.tsx     ← T2: pass full history in FollowUpInput
cli.py                              ← T4: maintain history list across loop turns
```

### Project Structure Notes

No new files required. No new npm packages. The change touches 3 files and is ~15–20 lines total.

The `chatHistory` grows unbounded (known deferred issue from Story 7.1 review). For POC scope this is acceptable. Do not add eviction in this story.

### References

- Bug location (frontend): `components/ai/QueryBar.tsx:44`, `components/ai/InsightDrawer.tsx:74`
- Bug location (CLI): `cli.py:19` — same single-message hard-code; `chat()` loop never accumulates history
- Designed contract (backend): `api/services/agent_service.py:94` — `history = [system_msg] + messages`
- Original multi-turn AC: `_bmad-output/implementation-artifacts/3-3-conversational-query-bar-with-tool-calling-and-graceful-degradation.md#AC3`
- Chat history store: `lib/shellStore.ts:46` — `startLiveQuery` appends user message synchronously
- Message type: `lib/types.ts:3-7` — `ChatMessage` interface with `id`, `role`, `content`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
