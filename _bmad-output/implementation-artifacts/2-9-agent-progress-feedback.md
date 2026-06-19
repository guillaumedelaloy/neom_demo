# Story 2.9: Agent Progress Feedback

**Story ID:** 2.9
**Story Key:** 2-9-agent-progress-feedback
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Workstream:** A+B — Backend agent loop + chat UI
**Status:** review
**Date Created:** 2026-04-13

<!-- Prerequisites: Story 2.8 done (get_sheet_labels exists; new Excel workflow is list_sheets → get_sheet_labels → run_python).
     Two tightly-coupled changes that must ship together:
       1. _MAX_ROUNDS 10 → 20 (backend only, api/services/agent_service.py)
       2. "thinking" SSE events emitted before each tool execution (backend) + handled in QueryBar.tsx (frontend)
     No changes to: excel_tools.py, __init__.py, InsightDrawer.tsx, shellStore.ts, agent_registry.py.
     InsightDrawer ALREADY renders aiLiveText during thinking phase — no changes needed there. -->

---

## Story

As a user of the Ma'aden executive dashboard,
I want to see friendly progress messages while the agent is working ("Checking Excel sheets…", "Scanning for capex labels…"),
so that I understand what the agent is doing at each step instead of watching a silent spinner — and so that multi-step financial queries are not cut off prematurely by an insufficient round limit.

---

## Acceptance Criteria

**AC1:** `_MAX_ROUNDS` in `api/services/agent_service.py` is increased from `10` to `20`.
- The inline comment is updated to reflect the new Excel workflow: `list_sheets + get_sheet_labels + up to ~5× run_python + final answer`

**AC2:** A module-level dict `_PROGRESS` in `agent_service.py` maps every known tool name to a concise user-friendly string. All 12 tools currently in `TOOL_REGISTRY` must have an entry. Unknown tools → no message (silently skipped, no error).

**AC3:** A helper `_thinking_msg(tool_name: str, args: dict) -> str | None` in `agent_service.py` returns the progress string, personalised where args are informative:
- `get_sheet_labels`: includes the sheet name — `"Scanning '{sheet_name}' for metric labels…"`
- `get_bu_schedule`: includes the BU code — `"Loading schedule for {bu_code}…"`
- All other tools: returns the flat string from `_PROGRESS`
- Unknown tool names: returns `None`

**AC4:** Inside `stream_agent_response`, immediately **before** calling `result(**args)` for each tool call, if `_thinking_msg` returns a non-None string, yield:
```
data: {"type": "thinking", "content": "<message>"}
```
The `thinking` event must be yielded before the synchronous tool execution (not after), so the user sees it while the tool is running.

**AC5:** `components/ai/QueryBar.tsx` handles the new `"thinking"` event type:
- On `payload.type === "thinking"`: call `setAiLiveText(payload.content)` — shows the message in the InsightDrawer during the tool call
- Do NOT add to `accumulated` — the thinking text is transient and must NOT appear in the final answer
- The existing `token` / `done` / `not_supported` / `error` handling is unchanged

**AC6:** Behaviour end-to-end: when the user asks a financial question:
1. Drawer opens, shows "Calling tools…" (existing — `aiLiveText` is empty)
2. `list_sheets` fires → drawer shows "Checking which Excel sheets are available…" + `▌` cursor
3. `get_sheet_labels('Consolidated Group')` fires → drawer shows "Scanning 'Consolidated Group' for metric labels…" + `▌`
4. `run_python(...)` fires → "Extracting figures from the financial model…" + `▌`
5. First `token` arrives → `accumulated` starts empty, drawer switches to final answer content
6. `done` → phase transitions to "speaking"; final answer is clean (no thinking text mixed in)

**AC7:** No existing SSE event types (`token`, `done`, `not_supported`, `error`) are modified. Frontend consumers other than `QueryBar.tsx` (if any) are unaffected.

**AC8:** `agent_service.py` has no new external dependencies — `_PROGRESS` and `_thinking_msg` are pure Python dicts/functions.

---

## Tasks / Subtasks

- [x] T1: Increase `_MAX_ROUNDS` and update comment (AC: 1)
  - [x] T1.1: Change `_MAX_ROUNDS = 10` to `_MAX_ROUNDS = 20`
  - [x] T1.2: Update comment to: `# list_sheets + get_sheet_labels + up to ~5× run_python + retries + final answer`

- [x] T2: Add `_PROGRESS` dict and `_thinking_msg` helper to `agent_service.py` (AC: 2, 3)
  - [x] T2.1: Add `_PROGRESS` dict after `_MAX_ROUNDS` — covers all 12 tools in TOOL_REGISTRY
  - [x] T2.2: Add `_thinking_msg(tool_name, args)` — returns personalised string or None
  - [x] T2.3: Confirm `get_sheet_labels` and `get_bu_schedule` use args for personalisation

- [x] T3: Emit `thinking` SSE events in `stream_agent_response` (AC: 4)
  - [x] T3.1: Before `result(**args)`, call `_thinking_msg(tc.function.name, args)`
  - [x] T3.2: If result is not None, `yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"`
  - [x] T3.3: Tool execution and history append remain unchanged

- [x] T4: Handle `thinking` type in `QueryBar.tsx` (AC: 5)
  - [x] T4.1: Add `if (payload.type === "thinking") { setAiLiveText(payload.content); }` in the SSE loop
  - [x] T4.2: Confirm `accumulated` is NOT modified by thinking events — final answer stays clean
  - [x] T4.3: Existing `token` / `done` / `not_supported` / `error` handling unchanged

- [x] T5: Verify end-to-end (AC: all)
  - [x] T5.1: `_MAX_ROUNDS` is 20 in agent_service.py
  - [x] T5.2: `_thinking_msg("list_sheets", {})` → `"Checking which Excel sheets are available…"`
  - [x] T5.3: `_thinking_msg("get_sheet_labels", {"sheet_name": "P&L"})` → `"Scanning 'P&L' for metric labels…"`
  - [x] T5.4: `_thinking_msg("unknown_tool", {})` → `None`
  - [x] T5.5: All 12 TOOL_REGISTRY keys have an entry in `_PROGRESS`

---

## Dev Notes

### Why 20 rounds, not more

The new 3-step Excel workflow (`list_sheets → get_sheet_labels → run_python`) uses 3 mandatory rounds minimum. Complex questions may need 2–3 `run_python` retries (e.g., wrong row slice on first attempt). 20 rounds leaves headroom for:
- 1 `list_sheets`
- 1–3 `get_sheet_labels` (multi-sheet disambiguation)
- 5 `run_python` attempts
- 1–2 `search_documents` if the question is mixed
- 1 final answer round
= 11–13 rounds typically; 20 is a safe ceiling.

### Why `thinking` type instead of `token`

Using `token` would pollute `accumulated`. The final answer shown to the user would start with "Checking which Excel sheets are available…" — unacceptable. A distinct `thinking` type lets the frontend display it transiently without accumulation. When the first real `token` arrives, `accumulated` is still `""` and the answer builds cleanly.

### InsightDrawer — no changes needed

`InsightDrawer.tsx` line 76:
```tsx
{aiPhase === "thinking" ? aiLiveText + "▌" : aiLiveText}
```
`aiLiveText` is set by both `thinking` events (transient) and `token` events (accumulated). The drawer already renders whichever value is current. No modification needed.

`InsightDrawer.tsx` line 80 shows "Calling tools…" only when `aiLiveText === ""` (before the first thinking event). Once thinking events flow, it transitions automatically to the message text.

### `_thinking_msg` implementation pattern

```python
_PROGRESS: dict[str, str] = {
    "list_sheets": "Checking which Excel sheets are available…",
    "get_sheet_labels": "Scanning sheet for metric labels…",  # overridden below
    "preview_sheet": "Previewing sheet layout…",
    "preview_sheets": "Inspecting candidate sheets…",
    "run_python": "Extracting figures from the financial model…",
    "search_documents": "Searching strategy and planning documents…",
    "get_schedule_overview": "Loading project schedule overview…",
    "get_bu_schedule": "Loading business unit schedule…",  # overridden below
    "estimate_delay_impact": "Estimating delay impact…",
    "get_phos3_summary": "Loading Phosphate 3 EPC summary…",
    "get_phos3_milestones": "Checking Phosphate 3 milestones…",
    "get_phos3_changes": "Reviewing Phosphate 3 recent changes…",
}


def _thinking_msg(tool_name: str, args: dict) -> str | None:
    if tool_name not in _PROGRESS:
        return None
    if tool_name == "get_sheet_labels":
        return f"Scanning '{args.get('sheet_name', 'sheet')}' for metric labels…"
    if tool_name == "get_bu_schedule":
        bu = args.get("bu_code", "")
        return f"Loading schedule for {bu}…" if bu else _PROGRESS[tool_name]
    return _PROGRESS[tool_name]
```

### QueryBar.tsx patch (exact diff)

```typescript
// BEFORE (line 45):
if (payload.type === "token") { accumulated += payload.content; setAiLiveText(accumulated); }

// AFTER (insert one line before existing token handler):
if (payload.type === "thinking") { setAiLiveText(payload.content); }
if (payload.type === "token") { accumulated += payload.content; setAiLiveText(accumulated); }
```

### Emit pattern in stream_agent_response

```python
# BEFORE (current):
with logfire.span("tool call {tool}", tool=tc.function.name, args=args):
    result = registry.get(tc.function.name)
    tool_result = result(**args) if result else {"error": f"Unknown tool: {tc.function.name}"}

# AFTER:
msg = _thinking_msg(tc.function.name, args)
if msg:
    yield f"data: {json.dumps({'type': 'thinking', 'content': msg})}\n\n"
with logfire.span("tool call {tool}", tool=tc.function.name, args=args):
    result = registry.get(tc.function.name)
    tool_result = result(**args) if result else {"error": f"Unknown tool: {tc.function.name}"}
```

Note: `msg` shadows nothing — `_thinking_msg` is called with the loop-local `tc.function.name` and `args`.

### Colleague boundaries

| File | Rule |
|---|---|
| `api/services/agent_service.py` | Add `_PROGRESS`, `_thinking_msg`, increase `_MAX_ROUNDS`, emit `thinking` events — nothing else |
| `components/ai/QueryBar.tsx` | Add single `thinking` handler line only — no other changes |
| `components/ai/InsightDrawer.tsx` | DO NOT TOUCH — already handles `aiLiveText` correctly |
| `lib/shellStore.ts` | DO NOT TOUCH — `setAiLiveText` already works for thinking events |
| `api/services/tools/**` | DO NOT TOUCH |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- `_MAX_ROUNDS` increased from 10 to 20 with updated comment reflecting the 3-step Excel workflow.
- `_PROGRESS` dict added with all 12 TOOL_REGISTRY tools.
- `_thinking_msg` helper returns personalised strings for `get_sheet_labels` (includes sheet name) and `get_bu_schedule` (includes BU code); returns `None` for unknown tools.
- `thinking` SSE events emitted before each tool execution using local variable `thinking` (avoids shadowing the outer `msg` LLM response object).
- `QueryBar.tsx` handles `"thinking"` payload type by calling `setAiLiveText(payload.content)` without touching `accumulated` — final answer stays clean.
- All 12 TOOL_REGISTRY keys verified against `_PROGRESS` via inline assertion check.

### File List
- `api/services/agent_service.py` — MODIFIED: _MAX_ROUNDS → 20, add _PROGRESS + _thinking_msg, emit thinking events
- `components/ai/QueryBar.tsx` — MODIFIED: handle "thinking" SSE event type

### Change Log
- 2026-04-13: Story 2.9 implemented — _MAX_ROUNDS 10→20, _PROGRESS dict + _thinking_msg helper, thinking SSE events per tool call, QueryBar.tsx one-line handler
