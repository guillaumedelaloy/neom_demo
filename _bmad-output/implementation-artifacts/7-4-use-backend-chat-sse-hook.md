# Story 7.4: SSE Client Hook — `useBackendChat`

Status: review

## Story

As a developer,
I want a single hook that owns the entire SSE fetch lifecycle for backend chat,
so that `CeoIntelligenceProvider` calls one function and reacts to a clean set of state values — with no SSE logic scattered across the codebase.

## Acceptance Criteria

1. `src/intelligence/useBackendChat.ts` exists and is ≤120 lines.
2. The hook exports: `{ submit, streamedAnswer, activityLog, isRunning, activeAgentId, error }`.
3. Calling `submit(messages)` opens `POST /api/query` (via `getApiBase()`) with `Content-Type: application/json` and body `{ "messages": [...] }`, and sets `isRunning = true` immediately.
4. On an `agent` SSE event: `activeAgentId` is set to the mapped local `AgentId`; an `AgentLogEvent` is appended to `activityLog` with the agent label.
5. On a `thinking` SSE event: an `AgentLogEvent` is appended to `activityLog` using `activeAgentId` (or `'orchestrator'` if no `agent` event has arrived yet).
6. On a `token` SSE event: its `content` is appended to `streamedAnswer`.
7. On a `done` SSE event: `isRunning` is set to `false`.
8. On an `error` or `not_supported` SSE event: `error` is set to the event's `content` and `isRunning` is set to `false`.
9. The in-flight `fetch` is aborted via `AbortController` on component unmount.
10. `pnpm build` exits with code 0 after this story.

## Tasks / Subtasks

- [x] Task 1 — Define types needed by the hook (AC: #2, #4)
  - [x] Confirm `AgentId` and `AgentLogEvent` types exist in `src/intelligence/types.ts`
  - [x] Add `BackendMessage` type if not already present: `{ role: 'user' | 'assistant'; content: string }`
  - [x] Confirm no new types are needed beyond what exists

- [x] Task 2 — Implement `useBackendChat` hook (AC: #1–#9)
  - [x] Create `src/intelligence/useBackendChat.ts`
  - [x] Initialize state: `streamedAnswer: ''`, `activityLog: AgentLogEvent[]`, `isRunning: false`, `activeAgentId: AgentId | null`, `error: string | null`
  - [x] Implement backend agent ID → local `AgentId` mapping (see Dev Notes)
  - [x] Implement `submit(messages: BackendMessage[])` as an async function using `fetch` + `ReadableStream` reader
  - [x] SSE line parsing: split chunk on `\n`, find lines starting with `data: `, parse JSON, dispatch to state setters
  - [x] Wire `AbortController`: create on each `submit` call, store in `useRef`, call `abort()` in `useEffect` cleanup
  - [x] Reset state at start of each `submit` call: clear `streamedAnswer`, `activityLog`, `error`, `activeAgentId`

- [x] Task 3 — Validation (AC: #10)
  - [x] Run `pnpm build` — 0 TypeScript errors
  - [x] Run `pnpm lint` — 0 errors

## Dev Notes

### Backend → frontend `AgentId` mapping
```ts
const AGENT_ID_MAP: Record<string, AgentId> = {
  'data-retrieval': 'orchestrator',
  'risk-radar':     'risk_radar',
  'delivery-engine':'delivery_engine',
  'value-lens':     'value_lens',
  'gap-finder':     'gap_finder',
  'action-desk':    'action_desk',
}
```
If `agent_id` is not in the map, fall back to `'orchestrator'`.

### SSE stream parsing pattern
The backend sends newline-delimited SSE. Each chunk from the `ReadableStream` may contain multiple lines. Parse defensively:
```ts
const lines = chunk.split('\n')
for (const line of lines) {
  if (!line.startsWith('data: ')) continue
  try {
    const event = JSON.parse(line.slice(6))
    // dispatch on event.type
  } catch { /* skip malformed lines */ }
}
```

### Backend SSE event contract (reference)
| `type` | Fields | Action |
|--------|--------|--------|
| `agent` | `agent_id`, `content` | Set `activeAgentId` via mapping; append to `activityLog` |
| `thinking` | `content` | Append to `activityLog` with current `activeAgentId` or `'orchestrator'` |
| `token` | `content` | Append to `streamedAnswer` |
| `done` | — | `isRunning = false` |
| `error` | `content` | `error = content`, `isRunning = false` |
| `not_supported` | `content` | `error = content`, `isRunning = false` |

### `AgentLogEvent` shape (from `src/intelligence/types.ts`)
Confirm the existing type — it likely has `{ agent: AgentId; message: string }` or similar. Match the shape exactly; do not redefine it.

### Hook does NOT manage conversation history
`CeoIntelligenceProvider` (Story 7.5) owns the `messages` array and passes it to `submit()`. This hook is stateless with respect to history.

### API URL
```ts
import { getApiBase } from '../lib/api'
const url = `${getApiBase()}/api/query`
```

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Backend uses `splitlines(keepends=True)` for token events — newlines are already embedded in each `content` value, so simple string concatenation (`prev + content`) reconstructs the full answer correctly.
- `break outer` used on `done`/`error`/`not_supported` events to exit the nested loop cleanly without reading further from the stream.

### Completion Notes List
- Added `BackendMessage` type to `src/intelligence/types.ts` (top of file, before `CeoScope`).
- Created `src/intelligence/useBackendChat.ts` — 103 lines, within ≤120 budget.
- `AGENT_ID_MAP` maps all 6 backend agent IDs (from `api/agents.yaml`) to designer `AgentId` values — preserving the designer's per-agent icon/colour system in `CeoChatDrawer`.
- `AbortController` created fresh on each `submit` call; previous request aborted before new one starts; cleaned up on unmount via `useEffect`.
- `BackendMessage` re-exported from hook file so `CeoIntelligenceProvider` (Story 7.5) can import it from one place.
- `pnpm build` → clean, `pnpm lint` → clean.

### File List
**Modified:**
- `src/intelligence/types.ts` — added `BackendMessage` type
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 7-4 status updated

**Added:**
- `src/intelligence/useBackendChat.ts` — full SSE lifecycle hook (103 lines)

### Change Log
- 2026-04-14: Created `useBackendChat` hook — SSE fetch, agent mapping, activity log, abort on unmount.
