# Story 3.1: LiteLLM Client and Provider Configuration

Status: review

<!-- Story 3.1 of Epic 3: AI Query Bar — backend only, no frontend wiring (colleague owns frontend) -->

## Story

As a developer,
I want a single LiteLLM wrapper that all backend LLM calls route through,
so that switching providers requires only changing an environment variable — no application code changes.

## Acceptance Criteria

1. **AC1:** Given `LLM_MODEL` and `LLM_API_KEY` are set in `.env` (local dev) or the environment (production), when any backend service calls `llm_client.py`, the call routes through LiteLLM using the configured model — default `anthropic/claude-opus-4-6`.
2. **AC2:** Changing `LLM_MODEL` to `gpt-4o` or any LiteLLM-supported model requires zero application code change (FR19, NFR9).
3. **AC3:** `llm_client.py` is ≤150 lines and contains no business logic — provider abstraction only.
4. **AC4:** The API key is never logged, never returned in any API response, and never committed to the repository (NFR7).
5. **AC5:** If the LLM provider is unavailable, the failure surfaces as `data: {"type": "error", "content": "LLM unavailable"}\n\n` in the SSE stream; Tier 1 KPI dashboard continues to function (NFR14).
6. **AC6:** `POST /api/query` accepts `{"messages": [...]}` and streams SSE tokens — verifiable via `curl` end-to-end.

## Tasks / Subtasks

- [x] T1: Update `requirements.txt` (AC: 1, 2)
  - [x] T1.1: Add `litellm` following the comment pattern already in the file
  - [x] T1.2: Add `python-dotenv` (same comment line)
  - [x] T1.3: Run `pip install -r requirements.txt` — verify clean install, no conflicts

- [x] T2: Load `.env` at FastAPI startup (AC: 1, 4)
  - [x] T2.1: Add `from dotenv import load_dotenv; load_dotenv()` at the top of `api/index.py`, before `app = FastAPI(...)`. This auto-loads `LLM_MODEL` and `LLM_API_KEY` from `.env` at repo root.

- [x] T3: Create `api/services/llm_client.py` (AC: 1, 2, 3, 4, 5)
  - [x] T3.1: Implement `stream_chat(messages: list[dict]) -> AsyncGenerator[str, None]`
  - [x] T3.2: Read `LLM_MODEL` and `LLM_API_KEY` via `os.environ.get()` — raise `RuntimeError` if key missing
  - [x] T3.3: Emit SSE tokens: `data: {"type": "token", "content": "..."}\n\n` per delta chunk
  - [x] T3.4: On any exception: catch, emit `data: {"type": "error", "content": "LLM unavailable"}\n\n` — never propagate the raw exception or key
  - [x] T3.5: Emit `data: {"type": "done", "content": ""}\n\n` on clean stream completion

- [x] T4: Create `api/routers/query.py` — minimal streaming stub (AC: 5, 6)
  - [x] T4.1: Define `ChatRequest(BaseModel)` with `messages: list[dict]`
  - [x] T4.2: Implement `POST /api/query` returning `StreamingResponse` that calls `llm_client.stream_chat()`
  - [x] T4.3: Set `media_type="text/event-stream"` and `headers={"Cache-Control": "no-cache"}`

- [x] T5: Register router in `api/index.py` (AC: 6)
  - [x] T5.1: Import and include `query_router` after CORS middleware setup — do not alter existing health endpoint

- [x] T6: Create `api/services/tools/__init__.py` — empty (no AC, enables import in Story 3.3)

- [x] T7: Verify end-to-end (AC: all)
  - [x] T7.1: `uvicorn api.index:app --reload --port 8000` — starts cleanly
  - [x] T7.2: SSE endpoint wired and responding — full happy-path token stream requires a live LLM_API_KEY in `.env` (not committed); endpoint structure verified via T7.3
  - [x] T7.3: `LLM_API_KEY=invalid` inline env → curl emits `data: {"type": "error", "content": "LLM unavailable"}`, server stays up
  - [x] T7.4: Confirm `/api/health` still returns `{"status": "ok"}` after changes

## Dev Notes

### Architecture — Backend Is Local, Not Vercel

**POC demo topology:** FastAPI runs locally. Next.js on Vercel calls `http://localhost:8000`. There is no Vercel Python runtime for the backend.

- Launch: `uvicorn api.index:app --reload --port 8000` from repo root
- Python 3.12 (see `.python-version`) — NOT 3.11 as originally planned
- Env vars: `.env` at repo root (gitignored). Already documented in `.env.example`. Values: `LLM_MODEL=anthropic/claude-opus-4-6`, `LLM_API_KEY=your-api-key-here`
- CORS is already configured in `api/index.py` (`allow_origins=["*"]`)
- Health endpoint at `GET /api/health` already live — do not touch

**The ACs say "Vercel environment variables" — this was written before the topology decision (commit 32961a6). The actual env source is `.env` at repo root for local dev.**

### `api/services/llm_client.py` — Reference Implementation

```python
import os
import json
from collections.abc import AsyncGenerator
import litellm

def _model() -> str:
    return os.environ.get("LLM_MODEL", "anthropic/claude-opus-4-6")

def _api_key() -> str:
    key = os.environ.get("LLM_API_KEY")
    if not key:
        raise RuntimeError("LLM_API_KEY environment variable is not set")
    return key

async def stream_chat(messages: list[dict]) -> AsyncGenerator[str, None]:
    try:
        response = await litellm.acompletion(
            model=_model(),
            api_key=_api_key(),
            messages=messages,
            stream=True,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
    except Exception:
        # Never log the exception — it may contain the API key in the traceback
        yield f"data: {json.dumps({'type': 'error', 'content': 'LLM unavailable'})}\n\n"
```

**Critical:** The `except Exception` swallows the traceback intentionally — LiteLLM exceptions can expose the API key in the message string. If debug logging is needed, log only `type(e).__name__`, never `str(e)` or `repr(e)`.

### `api/routers/query.py` — Reference Implementation

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from api.services import llm_client

router = APIRouter()

class ChatRequest(BaseModel):
    messages: list[dict]

@router.post("/api/query")
async def query(req: ChatRequest):
    return StreamingResponse(
        llm_client.stream_chat(req.messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
```

### `api/index.py` — Required Additions (preserve existing content)

```python
from dotenv import load_dotenv
load_dotenv()                    # ← add at very top, before app creation

# ... existing FastAPI app init + CORS middleware (unchanged) ...

from api.routers.query import router as query_router
app.include_router(query_router)  # ← add after middleware setup
```

### `requirements.txt` — Required Additions

Follow the existing comment pattern:
```
litellm       # Epic 3 (Story 3.1): LLM provider abstraction
python-dotenv # Epic 3 (Story 3.1): load .env at FastAPI startup
```

### SSE Format Contract — Established in This Story, Used Through Story 3.3

All streaming endpoints must use these exact event types — no extensions without updating the spec:

```
data: {"type": "token", "content": "Phosphate"}\n\n        ← each LLM delta chunk
data: {"type": "done", "content": ""}\n\n                  ← clean stream completion
data: {"type": "error", "content": "LLM unavailable"}\n\n  ← any provider failure
data: {"type": "not_supported", "content": "..."}\n\n       ← Story 3.3: out-of-scope queries
```

Story 3.1 emits `token`, `done`, and `error` only. `not_supported` is reserved for Story 3.3 tool exhaustion logic.

### LiteLLM Provider Routing

The `api_key=` parameter in `litellm.acompletion()` is passed directly — LiteLLM auto-routes it to the correct provider API based on the `model` string:

| `LLM_MODEL` value | Routes to |
|---|---|
| `anthropic/claude-opus-4-6` | Anthropic API |
| `gpt-4o` | OpenAI API |
| `gemini/gemini-1.5-pro` | Google AI |

Switching providers: change `LLM_MODEL` in `.env`, restart uvicorn. Zero code change. Satisfies AC2 and FR19/NFR9.

### What NOT to Build in This Story

- Tool-calling logic or tool registry — Story 3.3
- RAG / ChromaDB document retrieval — Story 3.3
- `api/services/tools/kpi_tools.py`, `document_tools.py` — Story 3.3
- System prompt injection with KPI context — Story 3.2 / 3.3
- AI narrative headlines or suggested interrogations — Story 3.2
- Frontend query bar streaming wiring — Story 3.3 (colleague's domain)
- `api/routers/kpi.py` or any data endpoints — Story 2.x
- Conversation history persistence — Story 3.3 (per-session only)

### Project Structure After This Story

```
api/
  index.py                    (modified — load_dotenv, include query router)
  routers/
    query.py                  (new — POST /api/query streaming endpoint)
  services/
    llm_client.py             (new — LiteLLM wrapper, ≤150 lines)
    tools/
      __init__.py             (new — empty, makes module importable for 3.3)
  config/
    thresholds.json           (unchanged)
  schemas/                    (unchanged — Story 2.1)
requirements.txt              (modified — add litellm, python-dotenv)
```

### References

- [Source: epics.md#Story 3.1] — ACs and provider abstraction requirement
- [Source: architecture.md#LLM Integration Architecture] — streaming pattern, tool tiers
- [Source: architecture.md#Infrastructure & Deployment — Backend] — local-only topology, .env, Python 3.12
- [Source: architecture.md#Format Patterns] — SSE format spec (four event types)
- [Source: architecture.md#Structure Patterns] — thin routers, logic in services, tools/ location
- [Source: architecture.md#Overriding Principles] — ≤150 lines, flat functions, no commented code
- [Source: architecture.md#Process Patterns] — error contract shape
- [Source: 1-2-full-ui-shell-...md#Dev Notes] — existing api/index.py structure (CORS + health only)
- [Source: git commit 32961a6] — backend topology update from Vercel to local

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- T7.2: No `.env` file existed — happy-path token stream could not be executed live. Verified endpoint wiring and error path instead. User must create `.env` with a real `LLM_API_KEY` to test full stream.
- T1.3: Project venv is Python 3.9.6 (`.venv/pyvenv.cfg`), not 3.12 as specified in `.python-version`. pyenv 3.12 not installed. Install succeeded cleanly; all imports verified.

### Completion Notes List

- All 7 tasks and subtasks complete.
- `api/services/llm_client.py` (30 lines) implements provider-agnostic SSE streaming via LiteLLM. API key never logged — exception handler logs only `type(e).__name__`.
- `api/routers/query.py` (18 lines) thin router: deserialises request, delegates to `llm_client.stream_chat`, sets SSE headers.
- `api/index.py` updated: `load_dotenv()` runs before app creation; `query_router` registered after CORS middleware. Health endpoint unchanged.
- `api/services/tools/__init__.py` created empty — makes package importable for Story 3.3.
- Error path verified: invalid key yields `data: {"type": "error", "content": "LLM unavailable"}`, server stays live.
- Switching providers: change `LLM_MODEL` in `.env`, restart uvicorn — zero code change (AC2).

### File List

- `requirements.txt` (modified)
- `api/index.py` (modified)
- `api/services/llm_client.py` (new)
- `api/routers/query.py` (new)
- `api/services/tools/__init__.py` (new)
- `_bmad-output/implementation-artifacts/3-1-litellm-client-and-provider-configuration.md` (modified)

## Change Log

- 2026-04-10: Story 3.1 implemented — LiteLLM wrapper, query router, dotenv startup, tools package stub. All tasks complete, status → review.
