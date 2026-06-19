# Story 3.10: Data Source Citation in Agent Responses

Status: ready-for-dev

## Story

As Bob (CEO),
I want every agent response to explicitly state which data sources it drew from,
So that I can immediately judge how much to trust an answer and challenge my teams with a clear reference to the underlying data.

## Acceptance Criteria

**AC1 — No-tool guardrail:**
Given an agent completes a response **without calling any tools**, the response is suppressed and a `not_supported` SSE event is emitted with a fixed message explaining no data was consulted.

**AC2 — Footnote on tool-backed responses:**
Given an agent completes a response that used at least one tool, a strict footnote block is appended programmatically — not by the LLM — immediately after the response text, using the exact template defined in Dev Notes.

**AC3 — Footnote consistency:**
The footnote is always appended by `agent_service.py`, never by the LLM. Its format must be identical across every response (same separator, same label, same quoting of tool names).

**AC4 — Pipeline contract unchanged:**
`/api/query` SSE event types (`agent`, `thinking`, `token`, `done`, `error`, `not_supported`) are unchanged. The footnote is emitted as one or more `token` events after the main content, before `done`.

**AC5 — Tests cover both branches:**
Unit tests verify: (a) response with tool calls appends the correct footnote; (b) response with no tool calls emits `not_supported` and no `done` event.

## Tasks / Subtasks

- [ ] T1: Modify `api/services/agent_service.py`
  - [ ] T1.1: Remove the existing tools header (lines 110-112 — the `"Tools: X → Y\n\n"` prefix emitted before content)
  - [ ] T1.2: After streaming all content lines, if `tool_calls_made` is non-empty: emit the strict footnote via one `token` event (see Dev Notes for exact string)
  - [ ] T1.3: After streaming all content lines, if `tool_calls_made` is empty: emit `not_supported` event (see Dev Notes) and return — **do NOT emit `done`**

- [ ] T2: Write / update tests
  - [ ] T2.1: `tests/test_agent_service.py` — mock `llm_client.chat_with_tools`; case A: tool calls present → last `token` event matches footnote template exactly; case B: no tool calls → `not_supported` emitted, no `done` event

- [ ] T3: Run full test suite — no regressions

## Dev Notes

### Exact change in `agent_service.py`

**Current code (lines 107–117) — REPLACE THIS:**
```python
if not msg.tool_calls:
    _dbg(f"no tool calls — generating final answer (tools used: {tool_calls_made})")
    logfire.info("final answer", tools_used=tool_calls_made)
    if tool_calls_made:
        header = "Tools: " + " → ".join(tool_calls_made) + "\n\n"
        yield f"data: {json.dumps({'type': 'token', 'content': header})}\n\n"
    content = msg.content or _NOT_SUPPORTED
    for line in content.splitlines(keepends=True):
        yield f"data: {json.dumps({'type': 'token', 'content': line})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
    return
```

**Replacement:**
```python
if not msg.tool_calls:
    _dbg(f"no tool calls — generating final answer (tools used: {tool_calls_made})")
    logfire.info("final answer", tools_used=tool_calls_made)
    if not tool_calls_made:
        yield f"data: {json.dumps({'type': 'not_supported', 'content': _NO_DATA_SOURCE_MSG})}\n\n"
        return
    content = msg.content or _NOT_SUPPORTED
    for line in content.splitlines(keepends=True):
        yield f"data: {json.dumps({'type': 'token', 'content': line})}\n\n"
    footnote = _build_footnote(tool_calls_made)
    yield f"data: {json.dumps({'type': 'token', 'content': footnote})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
    return
```

### New constants and helper to add in `agent_service.py`

Add alongside the existing `_NOT_SUPPORTED` constant:

```python
_NO_DATA_SOURCE_MSG = (
    "I was unable to retrieve any data to support this answer. "
    "Please rephrase your question or check that the relevant data sources are available."
)

_TOOL_DISPLAY_NAMES: dict[str, str] = {
    "search_documents": "Strategy & planning documents (ChromaDB RAG)",
    "get_schedule_overview": "Project schedule overview (XER)",
    "get_bu_schedule": "Business unit schedule (XER)",
    "estimate_delay_impact": "Delay impact estimator (XER)",
    "describe_workbook": "Financial workbook index (Excel)",
    "run_python": "Financial model computation (Excel)",
    "list_sheets": "Excel workbook sheet list",
    "preview_sheet": "Excel sheet preview",
    "get_phos3_summary": "Phosphate 3 EPC summary (XER)",
    "get_phos3_milestones": "Phosphate 3 milestones (XER)",
    "get_phos3_changes": "Phosphate 3 recent changes (XER)",
}


def _build_footnote(tool_calls: list[str]) -> str:
    """Return the strict citation footnote appended to every tool-backed response."""
    unique_tools = list(dict.fromkeys(tool_calls))  # preserve order, deduplicate
    labels = [_TOOL_DISPLAY_NAMES.get(t, t) for t in unique_tools]
    sources = "; ".join(labels)
    return f"\n\n---\n**Data sources:** {sources}"
```

### Footnote template (canonical form)

```
\n\n---\n**Data sources:** <label1>; <label2>
```

Examples:
```
---
**Data sources:** Project schedule overview (XER); Business unit schedule (XER)
```
```
---
**Data sources:** Strategy & planning documents (ChromaDB RAG)
```
```
---
**Data sources:** Financial workbook index (Excel); Financial model computation (Excel)
```

The separator `---`, the label `**Data sources:**`, and the semicolon delimiter are **fixed and must never vary** across responses.

### File locations

| File | Change |
|------|--------|
| `api/services/agent_service.py` | Add `_NO_DATA_SOURCE_MSG`, `_TOOL_DISPLAY_NAMES`, `_build_footnote()`; replace lines 107–117 per above |
| `tests/test_agent_service.py` | New or updated tests (see AC5) |

**Do NOT touch:**
- `api/routers/query.py` — no changes needed
- `api/services/validator_service.py` — no changes needed
- `api/agents.yaml` — no changes needed
- Any frontend files

### Reuse pattern from Story 3.5

Story 3.5 established the `not_supported` guardrail pattern: emit `{"type": "not_supported", "content": "..."}` and return immediately without emitting `done`. Follow the same pattern here for the no-tool-call case (T1.3). The frontend already handles `not_supported` without breaking.

### Safety rules (carry forward from existing codebase)

- Exception logging: only `type(e).__name__`, never full stack traces
- API key must never appear in any SSE event content
- The `_build_footnote` helper must be pure (no I/O, no exceptions possible)

### Why footnote goes at the end, not the beginning

The current code prepends `"Tools: X → Y\n\n"` as a header. This is being replaced with a footnote (appended after content) because:
1. The CEO reads the answer first; the citation is supporting metadata, not a headline
2. A footer is consistent with academic citation conventions
3. The frontend renders the full streamed text as markdown — a `---` separator naturally floats the citation below the answer

### `tool_calls_made` deduplication

A single query may call the same tool multiple times (e.g. `run_python` called 3× to extract different rows). `_build_footnote` deduplicates using `dict.fromkeys()` which preserves insertion order in Python 3.7+. Do not use `set()` — it loses ordering.

### Test skeleton

```python
# tests/test_agent_service.py

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from api.services.agent_service import stream_agent_response


def _msg_with_tools(tool_names):
    msg = MagicMock()
    msg.content = "Here is the answer."
    msg.tool_calls = [
        MagicMock(
            id=f"tc_{i}",
            function=MagicMock(name=name, arguments="{}")
        )
        for i, name in enumerate(tool_names)
    ]
    return msg


def _msg_final(content="Here is the answer."):
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = None
    return msg


@pytest.mark.asyncio
async def test_footnote_appended_when_tools_called():
    tool_msg = _msg_with_tools(["get_schedule_overview", "search_documents"])
    final_msg = _msg_final()

    fake_response = lambda m: MagicMock(choices=[MagicMock(message=m)])
    responses = [fake_response(tool_msg), fake_response(final_msg)]
    call_count = 0

    async def fake_chat_with_tools(history, schemas):
        nonlocal call_count
        result = responses[call_count]
        call_count += 1
        return result

    # Tool registry must return something for the tool calls
    fake_registry = {"get_schedule_overview": lambda: {}, "search_documents": lambda **kw: {}}

    with patch("api.services.agent_service.llm_client.chat_with_tools", side_effect=fake_chat_with_tools):
        events = []
        async for chunk in stream_agent_response(
            [{"role": "user", "content": "Q"}],
            tool_registry=fake_registry,
            tool_schemas=[],
        ):
            events.append(json.loads(chunk.removeprefix("data: ").strip()))

    token_contents = [e["content"] for e in events if e["type"] == "token"]
    last_token = token_contents[-1]
    assert "---" in last_token
    assert "**Data sources:**" in last_token
    assert "Project schedule overview (XER)" in last_token
    assert any(e["type"] == "done" for e in events)


@pytest.mark.asyncio
async def test_not_supported_when_no_tools_called():
    final_msg = _msg_final()
    async def fake_chat_with_tools(history, schemas):
        return MagicMock(choices=[MagicMock(message=final_msg)])

    with patch("api.services.agent_service.llm_client.chat_with_tools", side_effect=fake_chat_with_tools):
        events = []
        async for chunk in stream_agent_response(
            [{"role": "user", "content": "Q"}],
            tool_registry={},
            tool_schemas=[],
        ):
            events.append(json.loads(chunk.removeprefix("data: ").strip()))

    types = [e["type"] for e in events]
    assert "not_supported" in types
    assert "done" not in types
```

## Story completion status

- Story file created: 2026-04-14
- Analysis: exhaustive
- Status: ready-for-dev
