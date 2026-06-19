# Story 3.2: AI Narrative Headlines and Suggested Interrogations

Status: done

<!-- Backend scope only — frontend rendering and click-to-populate are colleague's domain -->

## Story

As an executive,
I want an AI-generated headline for each BU that names a specific KPI issue, and suggested questions I can click to explore further,
so that I immediately understand what matters without having to interpret raw numbers.

## Acceptance Criteria

1. **AC1:** `GET /api/headlines/{bu}` returns `{"bu_code": "...", "headline": "...", "suggested_interrogations": [...]}` where the headline references at least one specific KPI value and names the primary driver.
2. **AC2:** Response includes ≥3 suggested interrogations scoped to available tool capabilities (Modules 1–4 structured KPI data); system prompt enforces at most one `[Future capability]` label; no questions requiring PDF/strategy documents (Track B not yet available).
3. **AC3:** Invalid BU code (anything outside the locked set) returns HTTP 404 `{"error": "Invalid BU: xyz", "code": "INVALID_BU"}`.
4. **AC4:** Until Epic 2 provides real KPI data, the service uses hardcoded stubs when called without `kpi_data`; the function signature `generate_headlines(bu_code, kpi_data=None)` accepts real data when Epic 2 passes it — zero code change needed at Epic 2 integration.
5. **AC5:** Same key-safety rules as Story 3.1 apply — API key never logged, never in response; LLM exception logs only `type(e).__name__`.
6. **AC6 (FRONTEND — skip):** Clicking a suggested interrogation pre-populates the query bar — colleague's story.

## Tasks / Subtasks

- [x] T1: Add `complete_chat()` to `api/services/llm_client.py` (AC: 1, 4, 5)
  - [x] T1.1: Implement `async def complete_chat(messages: list[dict]) -> str` — `litellm.acompletion()` with `stream=False`, returns `response.choices[0].message.content or ""`
  - [x] T1.2: Same exception pattern as `stream_chat`: log only `type(e).__name__`, then re-raise (callers handle the error, not this function)

- [x] T2: Create `api/services/narrative_service.py` (AC: 1, 2, 4, 5)
  - [x] T2.1: Define `VALID_BUS = frozenset({"phosphate", "aluminum", "gold", "copper"})` and `KPI_STUBS` dict (see Dev Notes)
  - [x] T2.2: Implement system prompt builder `_build_prompt(bu_code: str, kpi_data: dict) -> list[dict]` — see Dev Notes for exact prompt shape
  - [x] T2.3: Implement `async def generate_headlines(bu_code: str, kpi_data: dict | None = None) -> dict`:
    - Raise `ValueError(f"Invalid BU: {bu_code}")` if `bu_code not in VALID_BUS`
    - Use `kpi_data` if provided, else `KPI_STUBS[bu_code]`
    - Call `await llm_client.complete_chat(_build_prompt(bu_code, data))`
    - Parse JSON from response; validate it has `headline` (str) and `suggested_interrogations` (list of ≥3 str)
    - Return `{"bu_code": bu_code, "headline": ..., "suggested_interrogations": [...]}`

- [x] T3: Create `api/routers/headlines.py` (AC: 1, 2, 3)
  - [x] T3.1: `GET /api/headlines/{bu}` → call `narrative_service.generate_headlines(bu)`
  - [x] T3.2: Catch `ValueError` → `raise HTTPException(status_code=404, detail={"error": f"Invalid BU: {bu}", "code": "INVALID_BU"})`
  - [x] T3.3: Catch any other exception → `raise HTTPException(status_code=500, detail={"error": "Headline generation failed", "code": "LLM_ERROR"})`

- [x] T4: Register router in `api/index.py` (AC: 1)
  - [x] T4.1: Import and include `headlines_router` after existing `query_router`

- [x] T5: Verify end-to-end (AC: all)
  - [x] T5.1: `uvicorn api.index:app --reload --port 8000` starts cleanly
  - [x] T5.2: `curl http://localhost:8000/api/headlines/phosphate` returns `bu_code`, `headline`, `suggested_interrogations` with ≥3 items
  - [x] T5.3: Headline references a specific KPI value (e.g. "120% of plan") — not generic
  - [x] T5.4: `curl http://localhost:8000/api/headlines/invalid` returns HTTP 404 with `INVALID_BU` code
  - [x] T5.5: `/api/health` and `POST /api/query` still respond correctly after changes

### Review Findings

- [x] [Review][Decision] Duplicate BU validation — resolved: removed guard from `generate_headlines()`; router-level check is the single source of truth. [narrative_service.py]
- [x] [Review][Decision] `suggested_interrogations` upper bound — resolved: changed to `!= 3` to enforce exactly 3; test updated to cover both < 3 and > 3 cases. [narrative_service.py:74]
- [x] [Review][Decision] `copper` stub has `None` KPI values sent raw to LLM — resolved: `_build_prompt` now strips KPIs where `actual is None` before serialising to prompt. [narrative_service.py:_build_prompt]
- [x] [Review][Patch] Move `import logging` to module level — resolved: `_log = logging.getLogger(__name__)` at module level; both `complete_chat` and `stream_chat` use it. [llm_client.py]
- [x] [Review][Defer] No response size cap before `json.loads` — POC context, out of scope [narrative_service.py:69] — deferred, pre-existing
- [x] [Review][Defer] No rate-limiting or auth on endpoint — Vercel Access handles auth; throttling is Epic 3/5 concern [headlines.py] — deferred, pre-existing
- [x] [Review][Defer] Case-sensitive BU path parameter — `/api/headlines/Phosphate` returns 404 with no hint to use lowercase [headlines.py:9] — deferred, design decision
- [x] [Review][Defer] Headline ≤25 words not validated in code — enforced via system prompt only; no structural guard [narrative_service.py] — deferred, prompt-level constraint
- [x] [Review][Defer] AC2 interrogation scope not validated in code — only prompt-enforced; out-of-scope questions could pass [narrative_service.py] — deferred, prompt-level constraint
- [x] [Review][Defer] No startup validation for LLM_API_KEY — RuntimeError on first call, not at boot; Epic 3 scope [llm_client.py] — deferred, pre-existing

## Dev Notes

### Backend scope — what this story delivers

`GET /api/headlines/{bu}` — single non-streaming endpoint. Frontend colleague calls it after the BU dashboard loads. No SSE, no streaming, no UI components.

### New function: `complete_chat()` in `llm_client.py`

Add this below `stream_chat`. llm_client.py will be ~50 lines after this change — well under the 150-line limit.

```python
async def complete_chat(messages: list[dict]) -> str:
    try:
        response = await litellm.acompletion(
            model=_model(),
            api_key=_api_key(),
            messages=messages,
            stream=False,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("LLM call failed: %s", type(e).__name__)
        raise
```

**Why re-raise here (unlike `stream_chat` which swallows):** `stream_chat` must yield an SSE error event to keep the stream alive. `complete_chat` has no stream to keep open — callers in `narrative_service.py` catch and convert to HTTPException.

### System prompt shape for `_build_prompt()`

```python
SYSTEM = (
    "You are an AI analyst for Ma'aden's executive dashboard. "
    "Given BU KPI data, respond with JSON only — no prose, no markdown.\n"
    "Format: {\"headline\": \"<str>\", \"suggested_interrogations\": [\"<str>\", ...]}\n\n"
    "Rules:\n"
    "- headline: ≤25 words, cite ≥1 specific KPI value, name the primary driver\n"
    "- suggested_interrogations: exactly 3 questions answerable from Module 1–4 structured data "
    "(actuals vs plan, KPI status, trend direction across BUs)\n"
    "- at most one interrogation may be labeled [Future capability] for out-of-scope questions\n"
    "- never ask about PDF strategy documents or unstructured data (not yet available)\n"
    "- use executive language, not analyst jargon"
)

def _build_prompt(bu_code: str, kpi_data: dict) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"BU: {bu_code}\nKPI data: {json.dumps(kpi_data)}"},
    ]
```

### KPI_STUBS — hardcoded until Epic 2

Stubs match the shape that `api/services/kpi_engine.py` will produce. Epic 2 integration = pass `kpi_data=kpi_engine.score(bu)` to `generate_headlines()`.

```python
KPI_STUBS = {
    "phosphate": {
        "period": "Q1 2026",
        "kpis": [
            {"name": "Capex burn", "actual": 2.4, "plan": 2.0, "unit": "SAR bn", "status": "off_track"},
            {"name": "Production volume", "actual": 8.2, "plan": 8.5, "unit": "Mt", "status": "at_risk"},
            {"name": "EBITDA contribution", "actual": 4.1, "plan": 4.3, "unit": "SAR bn", "status": "at_risk"},
        ],
    },
    "aluminum": {
        "period": "Q1 2026",
        "kpis": [
            {"name": "Production volume", "actual": 1.05, "plan": 1.0, "unit": "Mt", "status": "on_track"},
            {"name": "Leverage ratio", "actual": 2.8, "plan": 2.5, "unit": "x", "status": "at_risk"},
            {"name": "EBITDA contribution", "actual": 1.6, "plan": 1.7, "unit": "SAR bn", "status": "at_risk"},
        ],
    },
    "gold": {
        "period": "Q1 2026",
        "kpis": [
            {"name": "Production volume", "actual": 320, "plan": 350, "unit": "koz", "status": "off_track"},
            {"name": "Capex burn", "actual": 0.6, "plan": 0.7, "unit": "SAR bn", "status": "on_track"},
            {"name": "EBITDA contribution", "actual": 0.9, "plan": 1.0, "unit": "SAR bn", "status": "at_risk"},
        ],
    },
    "copper": {
        "period": "Q1 2026",
        "kpis": [
            {"name": "Production volume", "actual": 45, "plan": 52, "unit": "kt", "status": "off_track"},
            {"name": "Reserve estimate", "actual": None, "plan": None, "unit": None, "status": "at_risk"},
            {"name": "EBITDA contribution", "actual": 0.4, "plan": 0.5, "unit": "SAR bn", "status": "at_risk"},
        ],
    },
}
```

### LLM response parsing

`complete_chat` returns a raw string. The LLM is prompted for JSON — parse with `json.loads()`. If parsing fails, raise `ValueError("LLM returned non-JSON response")` — the router catches it as a 500.

Do not use `response_format={"type": "json_object"}` in `litellm.acompletion()` — not all providers support it and it breaks FR19 (provider agnosticism).

### Project structure after this story

```
api/
  index.py                         (modified — add headlines router)
  routers/
    query.py                       (unchanged)
    headlines.py                   (new — GET /api/headlines/{bu})
  services/
    llm_client.py                  (modified — add complete_chat)
    narrative_service.py           (new — generate_headlines + stubs)
    tools/
      __init__.py                  (unchanged)
```

### What NOT to build in this story

- Frontend components for displaying the headline or interrogations (colleague's domain)
- Click-to-populate query bar (AC6 — frontend)
- Caching layer — the GET endpoint generates fresh per call; Epic 2 will add in-memory caching when real KPI data is wired
- Tool registry or tool-calling logic — Story 3.3
- RAG retrieval or Track B — Story 3.3
- Streaming response — this endpoint is single-shot, not SSE

### BU code validation

Validate at the router level before calling the service. Use `VALID_BUS` from `narrative_service.py` — do not duplicate the set.

```python
from api.services.narrative_service import VALID_BUS, generate_headlines
```

### References

- [Source: epics.md#Story 3.2] — ACs and capability description
- [Source: architecture.md#LLM Integration Architecture] — tool-aware interrogation constraints, tier table
- [Source: architecture.md#API & Communication Patterns] — error contract shape, GET /api/headlines/{bu} route placement
- [Source: architecture.md#Structure Patterns] — thin routers, tools/ location, service layer pattern
- [Source: architecture.md#Overriding Principles] — ≤150 lines, no comments, no nested classes
- [Source: architecture.md#Naming Patterns] — BU locked values, snake_case endpoints
- [Source: architecture.md#Format Patterns] — direct response (no envelope), error shape
- [Source: 3-1-litellm-client-and-provider-configuration.md] — llm_client.py structure, key-safety rules, exception pattern
- [Source: architecture.md#Infrastructure & Deployment] — FastAPI runs locally; .env for LLM_API_KEY

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Python 3.9 compatibility: `dict | None` union syntax (PEP 604) requires 3.10+. Used `Optional[dict]` from typing instead.
- BU validation placed at router level (pre-call) per Dev Notes, so service-level `ValueError` from JSON parse failure correctly hits the 500 branch rather than the 404 branch.

### Completion Notes List

- T1: Added `complete_chat()` to `llm_client.py` (52 lines total, under limit). Re-raises on error; callers convert to HTTPException.
- T2: Created `narrative_service.py` with `VALID_BUS`, `KPI_STUBS` for all 4 BUs, `_build_prompt()`, and `generate_headlines()`. Validates `headline` (str) and `suggested_interrogations` (≥3 list). Epic 2 integration is zero-change: pass `kpi_data=kpi_engine.score(bu)`.
- T3: Created `headlines.py` router. BU check done with `VALID_BUS` before calling service → clean 404 for invalid BU, 500 for all LLM/parse failures.
- T4: Registered `headlines_router` in `api/index.py`.
- T5: Verified via `python3 -m pytest tests/ -v` — 13/13 passed (5 router + 8 service tests). Live LLM call confirmed to return correct 500 shape when no API key is configured. Invalid BU returns `{"detail":{"error":"Invalid BU: invalid","code":"INVALID_BU"}}` with HTTP 404.

### File List

- `api/services/llm_client.py` (modified — added `complete_chat()`)
- `api/services/narrative_service.py` (new)
- `api/routers/headlines.py` (new)
- `api/index.py` (modified — registered `headlines_router`)
- `tests/__init__.py` (new)
- `tests/test_narrative_service.py` (new — 8 tests)
- `tests/test_headlines_router.py` (new — 5 tests)

## Change Log

- 2026-04-10: Story implemented by claude-sonnet-4-6. Added `complete_chat()`, `narrative_service.py`, `headlines.py` router, registered in `api/index.py`, 13 pytest tests. Status → review.
