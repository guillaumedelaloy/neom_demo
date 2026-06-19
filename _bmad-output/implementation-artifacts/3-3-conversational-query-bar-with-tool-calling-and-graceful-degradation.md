# Story 3.3: Conversational Query Bar with Tool Calling and Graceful Degradation

Status: review

<!-- Backend scope only — query bar UI, streaming render, and click-to-populate are colleague's domain -->

## Story

As an executive,
I want to type any question into a query bar and get an accurate answer grounded in loaded data — with a useful partial answer when evidence is incomplete and `not_supported` only when the system truly cannot help,
so that I can ask unscripted questions during the meeting without risking a hallucinated answer or a dead-end fallback.

## Acceptance Criteria

1. **AC1:** `POST /api/query` accepts `{"messages": [...]}` and streams SSE tokens; first token arrives within 3 seconds of submission (NFR3).
2. **AC2:** The agent calls available KPI tools before responding — answers cite specific KPI values from tool results (FR12, FR13).
3. **AC3:** Multi-turn conversation works: the client sends full message history; the backend prepends the system prompt and passes history to LiteLLM — no server-side session state required (FR15).
4. **AC4:** For questions outside available data scope, routing or validation emits `{"type": "not_supported", "content": "..."}` rather than a hallucinated answer; if the runtime has already gathered useful evidence but exhausts its tool-call budget or receives empty content, it makes one consolidation attempt before returning `not_supported`.
5. **AC5:** Same key-safety rules as Stories 3.1–3.2 — API key never logged, never in response; LLM exception logs only `type(e).__name__` (NFR7).
6. **AC6 (FRONTEND — skip):** Query bar renders streamed tokens token-by-token — colleague's story.

## Tasks / Subtasks

- [x] T1: Create `api/services/tools/kpi_tools.py` (AC: 2)
  - [x] T1.1: Define `TOOL_SCHEMAS` — three OpenAI-format tool definitions: `get_bu_kpi_summary`, `get_all_bu_summaries`, `get_deviation_list`
  - [x] T1.2: Implement `get_bu_kpi_summary(bu_code: str) -> dict` — returns `KPI_STUBS[bu_code]`; returns `{"error": ...}` for unknown BU
  - [x] T1.3: Implement `get_all_bu_summaries() -> dict` — returns full `KPI_STUBS`
  - [x] T1.4: Implement `get_deviation_list() -> list[dict]` — returns all KPIs with status `off_track` or `at_risk` across all BUs

- [x] T2: Populate `api/services/tools/__init__.py` (AC: 2)
  - [x] T2.1: Import and export `TOOL_SCHEMAS` and `TOOL_REGISTRY = {"get_bu_kpi_summary": ..., ...}` from `kpi_tools.py`

- [x] T3: Add `chat_with_tools()` to `api/services/llm_client.py` (AC: 1, 5)
  - [x] T3.1: `async def chat_with_tools(messages: list[dict], tools: list[dict])` — `litellm.acompletion` with `stream=False`, `tools=tools`; returns raw response; logs only `type(e).__name__` on exception

- [x] T4: Create `api/services/agent_service.py` (AC: 1, 2, 3, 4, 5)
  - [x] T4.1: Define `_SYSTEM` prompt instructing the LLM to use tools, cite KPI values, and emit the exact not-supported string for out-of-scope queries
  - [x] T4.2: Implement `_to_tool_result(tool_call) -> dict` — executes tool from `TOOL_REGISTRY`, returns `{"role": "tool", "tool_call_id": ..., "content": json.dumps(result)}`
  - [x] T4.3: Implement `_assistant_msg(msg) -> dict` — converts LiteLLM message to dict preserving `tool_calls` for next round
  - [x] T4.4: Implement `async def stream_agent_response(messages: list[dict]) -> AsyncGenerator[str, None]` — tool loop up to `_MAX_ROUNDS=3`; word-tokenises final content as `{"type": "token"}` SSE events; emits `{"type": "not_supported"}` when rounds exceeded; emits `{"type": "error"}` on LLM exception (keeps stream alive per NFR14)

- [x] T5: Update `api/routers/query.py` (AC: 1, 3)
  - [x] T5.1: Replace `llm_client.stream_chat` with `agent_service.stream_agent_response`; no change to request schema or response headers

- [x] T6: Write tests (AC: all backend ACs)
  - [x] T6.1: `tests/test_kpi_tools.py` — 6 tests: valid BU, invalid BU, all summaries, deviation list content, deviation list excludes on_track, TOOL_SCHEMAS schema validation
  - [x] T6.2: `tests/test_agent_service.py` — 3 async tests: direct response emits tokens+done, tool call round then response, max rounds exceeded emits not_supported

- [x] T7: Run full test suite — 22/22 pass (13 existing + 9 new); no regressions (AC: all)

## Dev Notes

### What this story delivers (backend)

`POST /api/query` gains a tool-calling agent loop. The endpoint contract (SSE format, request shape) is unchanged — the colleague's frontend already targets it. The agent replaces the previous `stream_chat` passthrough.

### Backfilled runtime contract (2026-04-15)

This story established the base tool-calling loop. Later prompt/runtime work tightened the user-facing behaviour:

- simple answers are concise by default rather than report-shaped
- citations point to original raw files, not tools or processed artefacts
- confidence and ambiguity are surfaced only when they materially affect trust
- strategy-document context is used only when it adds material value
- empty-content and max-round paths attempt one consolidation call before `not_supported`

### Tool-calling pattern

```
POST /api/query  ←  {"messages": [{"role": "user", "content": "How is phosphate tracking?"}]}

  agent_service.stream_agent_response(messages)
    └─ prepend _SYSTEM
    └─ loop up to MAX_ROUNDS:
         llm_client.chat_with_tools(history, TOOL_SCHEMAS)
           → if tool_calls:  execute via TOOL_REGISTRY, append results, continue
           → if no tool_calls: word-tokenise content → SSE token events → done
         if rounds exhausted → SSE not_supported event
```

### Multi-turn conversation

The client owns history. `POST /api/query` receives the full `messages` list each time. The backend prepends `_SYSTEM` every call and never persists state. This is intentional — no server-side sessions means zero session management complexity (POC constraint).

### SSE event types (architecture spec)

```
data: {"type": "token",        "content": "Phosphate "}
data: {"type": "done",         "content": ""}
data: {"type": "not_supported","content": "I don't yet have the data..."}
data: {"type": "error",        "content": "LLM unavailable"}   ← from llm_client on exception
```

### Tool schema format (LiteLLM-compatible)

```python
{
    "type": "function",
    "function": {
        "name": "get_bu_kpi_summary",
        "description": "...",
        "parameters": {
            "type": "object",
            "properties": {"bu_code": {"type": "string", "enum": [...]}},
            "required": ["bu_code"],
        },
    },
}
```

### chat_with_tools() in llm_client.py

Add below `complete_chat`. Keeps `llm_client.py` under 70 lines.

```python
async def chat_with_tools(messages: list[dict], tools: list[dict]):
    try:
        return await litellm.acompletion(
            model=_model(),
            api_key=_api_key(),
            messages=messages,
            tools=tools,
            stream=False,
        )
    except Exception as e:
        _log.error("LLM tool call failed: %s", type(e).__name__)
        raise
```

### _assistant_msg helper

LiteLLM's message object needs to be serialised back to a plain dict before appending to the history list for the next round:

```python
def _assistant_msg(msg) -> dict:
    d = {"role": "assistant", "content": msg.content}
    if msg.tool_calls:
        d["tool_calls"] = [
            {"id": tc.id, "type": "function",
             "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in msg.tool_calls
        ]
    return d
```

### KPI_STUBS reuse

`kpi_tools.py` imports `KPI_STUBS` and `VALID_BUS` from `narrative_service.py` — no duplication.

### Track B RAG — deferred

`requirements.txt` notes pypdf/sentence-transformers as a Story 3.3 dependency. For the first-integration milestone, Track B (PDF RAG) is out of scope. The tool registry is designed to accept new tools (e.g. `search_documents`) without changing the agent loop. Deferred to a follow-on story.

### What NOT to build

- Frontend streaming render (colleague's domain)
- Server-side session persistence — stateless by design
- Track B RAG / document retrieval — deferred
- Rate limiting / auth — Vercel Access handles auth; throttling deferred

### References

- [Source: epics.md#Story 3.3] — ACs and capability description
- [Source: architecture.md#LLM Integration Architecture] — tool-calling agent pattern, tool registry location
- [Source: architecture.md#Streaming SSE format] — four SSE event types
- [Source: architecture.md#Structure Patterns] — tools/ location, TOOL_REGISTRY pattern
- [Source: 3-2-ai-narrative-headlines-and-suggested-interrogations.md] — key-safety rules, KPI_STUBS shape

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- LLM exception propagation: `chat_with_tools` raises on missing API key (unlike `stream_chat` which yields an error SSE). Added try/except in `stream_agent_response` to catch and emit `{"type": "error"}`, keeping the streaming contract intact and fixing the pre-existing `test_query_endpoint_still_present` regression.

### Completion Notes List

- T1: Created `api/services/tools/kpi_tools.py` (64 lines). Three tool functions reading from `KPI_STUBS` (imported from `narrative_service.py` — no duplication). `TOOL_SCHEMAS` follows OpenAI tool-calling format; LiteLLM accepts it unchanged.
- T2: Populated `api/services/tools/__init__.py` with `TOOL_REGISTRY` dict and re-export of `TOOL_SCHEMAS`.
- T3: Added `chat_with_tools()` to `llm_client.py` (now 66 lines, under limit). Returns raw LiteLLM response so `agent_service` can inspect `.tool_calls`.
- T4: Created `api/services/agent_service.py` (65 lines). Stateless agent loop: prepends `_SYSTEM`, calls `chat_with_tools` up to 3 rounds, executes tools via `TOOL_REGISTRY`, word-tokenises final content as SSE token events. Catches LLM exceptions → error event (stream stays alive).
- T5: Updated `api/routers/query.py` to call `stream_agent_response`. Request/response shape unchanged — colleague's frontend requires no modification.
- T6–T7: 22/22 tests pass (13 pre-existing + 9 new). No regressions.

### File List

- `api/services/tools/kpi_tools.py` (new)
- `api/services/tools/__init__.py` (modified — populated TOOL_REGISTRY)
- `api/services/llm_client.py` (modified — added `chat_with_tools()`)
- `api/services/agent_service.py` (new)
- `api/routers/query.py` (modified — wired to agent_service)
- `tests/test_kpi_tools.py` (new — 6 tests)
- `tests/test_agent_service.py` (new — 3 tests)

## Change Log

- 2026-04-10: Story implemented by claude-sonnet-4-6. Tool-calling agent loop replacing plain stream_chat passthrough. KPI tools (3 functions), agent_service with MAX_ROUNDS=3, error-safe streaming. 22/22 tests pass. Status → review.
