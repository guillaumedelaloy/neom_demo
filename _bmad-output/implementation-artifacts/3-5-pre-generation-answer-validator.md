# Story 3.5: Pre-Generation Answer Validator

Status: done

<!-- Backend scope only — no frontend files touched -->

## Story

As a developer,
I want a pre-generation validator that runs before the main LLM call and determines whether the selected agent has sufficient data and knowledge to answer the query — returning either a clear "can't answer" explanation or a set of caveats and assumptions to include in the final answer,
So that every response is either honestly blocked at the gate or transparently qualified, and the user always understands the basis and limits of what they're reading.

## Acceptance Criteria

1. **AC1:** `api/prompts/validator.md` contains the validator prompt. It receives the agent's identity, the available tools summary, and the user query. It returns a single-line JSON object with one of two shapes (see Dev Notes).

2. **AC2:** `api/services/validator_service.py` exports `async validate_query(agent: dict, text: str) -> dict`. It calls `llm_client.complete_chat()` with the validator prompt, parses the response, and returns the parsed dict. On any exception it returns a safe fallback that allows the query to proceed with a single caveat noting the validation check could not complete.

3. **AC3:** When the validator returns `{"can_answer": false, "reason": "..."}`, `query.py` emits `{"type": "not_supported", "content": "..."}` immediately — no main LLM call is made. The content includes the reason and, where possible, what data or knowledge would be needed to answer.

4. **AC4:** When the validator returns `{"can_answer": true, "caveats": [...]}`, the caveats are appended to the agent's `system_prompt` before it is passed to `stream_agent_response`. The response streams normally. The caveats appear in the answer as transparent qualifications, not as a separate block.

5. **AC5:** The updated query pipeline order is: `route_query` → `validate_query` → `stream_agent_response`. Each step short-circuits to `not_supported` on failure.

6. **AC6:** The `/api/query` request/response contract is unchanged — frontend requires no modification.

7. **AC7:** `validator_service.py` is ≤40 lines. No files outside `api/` are touched.

8. **AC8:** Tests cover: can't-answer path emits `not_supported` with reason, can-answer path injects caveats into system prompt, validator exception triggers safe fallback (query proceeds), fallback caveat text is present in system prompt passed to `stream_agent_response`.

## Tasks / Subtasks

- [x] T1: Create `api/prompts/validator.md` (AC: 1)
  - [x] T1.1: Write the validator prompt (see Dev Notes for exact content)

- [x] T2: Create `api/services/validator_service.py` (AC: 2, 7)
  - [x] T2.1: Implement `async validate_query(agent: dict, text: str) -> dict`
  - [x] T2.2: Define `_FALLBACK` constant for the safe fallback response

- [x] T3: Update `api/routers/query.py` (AC: 3, 4, 5, 6)
  - [x] T3.1: Import `validate_query` from `validator_service`
  - [x] T3.2: After `route_query`, call `await validate_query(agent, last_user_message)`
  - [x] T3.3: If `can_answer` is false: emit `not_supported` with formatted reason and return
  - [x] T3.4: If `can_answer` is true: append caveats to `agent["system_prompt"]` before passing to `stream_agent_response`

- [x] T4: Write tests (AC: 8)
  - [x] T4.1: `tests/test_validator_service.py` — mock `complete_chat`; test can't-answer response, can-answer response, exception → fallback
  - [x] T4.2: `tests/test_query_pipeline.py` — can't-answer path emits `not_supported`; can-answer path injects caveats; validator exception does not block query

- [x] T5: Run full test suite — all pass, no regressions

## Dev Notes

### Updated pipeline in `query.py`

```
POST /api/query
  │
  ├─ route_query(last_user_message)
  │     └─ None → not_supported ("I can't help with that...")
  │
  ├─ validate_query(agent, last_user_message)
  │     ├─ can_answer: false → not_supported (reason + what's needed)
  │     └─ can_answer: true  → caveats appended to system_prompt
  │
  └─ stream_agent_response(messages, system_prompt=agent["system_prompt"])
        └─ SSE token stream → done
```

### `api/prompts/validator.md` — exact content

```markdown
You are a pre-answer validator for the NEOM CEO Cockpit.

Your job is to assess — BEFORE a response is generated — whether the agent has
sufficient data and knowledge to give a trustworthy answer to the user's query.

Agent: {agent_label}
Agent scope: {agent_description}

Available data and tools:
- KPI actuals vs. plan for Phosphate, Aluminum, Gold, and Copper business units
- Deviation list: all KPIs currently at_risk or off_track
- Q1 2026 performance data (YTD, quarterly breakdowns)
- No real-time data, no external market feeds, no project schedule files at this stage

User query: {query}

Assess whether the agent can give a grounded, trustworthy answer using only the
available data listed above.

If the agent CANNOT answer reliably, return exactly:
{"can_answer": false, "reason": "<one sentence: why not>", "needs": "<one sentence: what data or knowledge would be needed>"}

If the agent CAN answer — even partially or with limitations — return exactly:
{"can_answer": true, "caveats": ["<caveat 1>", "<caveat 2>"]}

Caveats should be honest, specific, and brief — e.g. "Based on Q1 2026 KPI data only; no real-time figures available."
Return ONLY the JSON object. No explanation, no markdown, no code block.
```

### `api/services/validator_service.py` — full implementation

```python
import json
import logging
import pathlib

from .llm_client import complete_chat

_log = logging.getLogger(__name__)

_PROMPT_FILE = pathlib.Path(__file__).parent.parent / "prompts" / "validator.md"
_PROMPT: str = _PROMPT_FILE.read_text()

_FALLBACK = {
    "can_answer": True,
    "caveats": ["Validation check could not complete — treat this answer with additional caution."],
}


async def validate_query(agent: dict, text: str) -> dict:
    try:
        prompt = (
            _PROMPT
            .replace("{agent_label}", agent["label"])
            .replace("{agent_description}", agent["description"])
            .replace("{query}", text)
        )
        response = await complete_chat([{"role": "user", "content": prompt}])
        return json.loads(response)
    except Exception as e:
        _log.warning("Validation failed: %s", type(e).__name__)
        return _FALLBACK
```

### Changes to `query.py`

```python
from .validator_service import validate_query

@router.post("/query")
async def query(body: QueryRequest):
    last = _last_user_message(body.messages)

    # Step 1: route
    agent = await route_query(last)
    if agent is None:
        async def _oos():
            yield f"data: {json.dumps({'type': 'not_supported', 'content': build_out_of_scope_message()})}\n\n"
        return StreamingResponse(_oos(), media_type="text/event-stream")

    # Step 2: validate
    validation = await validate_query(agent, last)
    if not validation.get("can_answer", True):
        reason = validation.get("reason", "Insufficient data to answer reliably.")
        needs = validation.get("needs", "")
        content = reason + (f" To answer this, I would need: {needs}" if needs else "")
        async def _blocked():
            yield f"data: {json.dumps({'type': 'not_supported', 'content': content})}\n\n"
        return StreamingResponse(_blocked(), media_type="text/event-stream")

    # Step 3: inject caveats and stream
    caveats = validation.get("caveats", [])
    system_prompt = agent["system_prompt"]
    if caveats:
        caveat_text = "\n\nBefore responding, note these caveats and state them transparently in your answer:\n" \
                      + "\n".join(f"- {c}" for c in caveats)
        system_prompt = system_prompt + caveat_text

    return StreamingResponse(
        agent_service.stream_agent_response(body.messages, system_prompt=system_prompt),
        media_type="text/event-stream",
    )
```

### Fallback behaviour

If `validate_query` raises any exception, it returns `_FALLBACK` — `can_answer: true` with a single caveat. The query proceeds. This ensures a validator outage does not silently block all queries. The caveat surfaces in the answer so the user knows the check was inconclusive.

### What this story deliberately defers

- The available data description in `validator.md` is hardcoded for now. A future story can make it dynamic (generated from `TOOL_SCHEMAS` at startup).
- Caveats appear inline in the answer via the system prompt instruction. A future story can add a structured `caveats` field to the SSE `done` event for the frontend to render separately.
- No confidence score is assigned here — that is Epic 6.3's responsibility.

### Key safety rules (carry forward from Stories 3.1–3.4)

- API key never logged, never in SSE response
- Validator exceptions log only `type(e).__name__`

### What NOT to touch

- Any file outside `api/`
- `api/services/agent_registry.py`
- `api/services/agent_service.py` (no further changes needed)
- `api/services/tools/`
- All existing tests

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Implemented `api/prompts/validator.md` with exact prompt content from spec including template variables `{agent_label}`, `{agent_description}`, `{query}`
- Implemented `api/services/validator_service.py` (29 lines, well under the 40-line limit). Uses same `complete_chat` + exception logging pattern as `agent_registry.py`. `_FALLBACK` allows queries to proceed on validator failure.
- Updated `api/routers/query.py`: removed `_placeholder()` stub, added validation step (Step 2), wired `stream_agent_response` (Step 3) with caveat injection into system prompt.
- Updated `tests/test_query_routing.py`: replaced `test_matched_agent_emits_placeholder` with `test_matched_agent_streams_response` since the placeholder was replaced by the full pipeline in this story.
- Created `tests/test_validator_service.py` (5 tests) and `tests/test_query_pipeline.py` (5 tests) covering all AC8 scenarios.
- Full test suite: 40/40 pass, no regressions.

### File List

- `api/prompts/validator.md` (new)
- `api/services/validator_service.py` (new, 29 lines)
- `api/routers/query.py` (modified — validation step + stream_agent_response wired; placeholder removed)
- `tests/test_validator_service.py` (new)
- `tests/test_query_pipeline.py` (new)
- `tests/test_query_routing.py` (modified — updated placeholder test to reflect new pipeline)

## Change Log

- 2026-04-13: Story created by claude-sonnet-4-6. Pre-generation validator with two paths: blocked (reason + needs) or proceed with caveats injected into system prompt. Fallback allows query to proceed on validator failure. Backend-only, workstream C.
- 2026-04-13: Story implemented by claude-sonnet-4-6. All 5 tasks complete. 40/40 tests pass. Status → review.
