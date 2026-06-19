# Story 2.4: Track B — ChromaDB RAG Pipeline

**Story ID:** 2.4
**Story Key:** 2-4-track-b-chromadb-rag-pipeline
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-13

<!-- Workstream A — Python backend only. No frontend changes.
     This story adds a new tool (search_documents) to the agent's TOOL_REGISTRY.
     The only shared file touched outside ws:A is api/services/tools/__init__.py (additive import)
     and api/services/agent_service.py (system prompt update only — one string change).
     ws:B and ws:D are unaffected. Coordinate with ws:C if they touch agent_service.py concurrently. -->

---

## Story

As a developer,
I want a pre-built ChromaDB vector index over selected NEOM documents,
so that the agent can answer questions grounded in strategy, execution, and investor relations content.

---

## Acceptance Criteria

**AC1:** `scripts/build_rag_index.py` (offline script) reads `data_extract/rag_manifest.json`, extracts text from each PDF and PPTX, chunks it, embeds with OpenAI `text-embedding-3-small`, and writes a persistent ChromaDB collection to `data_extract/chroma_db/`.

**AC2:** `api/services/rag_service.py` loads the pre-built ChromaDB collection at startup and exposes `search(query: str, n_results: int = 5) -> list[dict]` returning chunks with `text`, `source`, `category`, `page` metadata.

**AC3:** `api/services/tools/rag_tools.py` exposes `search_documents(query: str)` registered in `TOOL_REGISTRY` and `TOOL_SCHEMAS`. The agent can call it for any question about strategy, execution, investor relations, or risk content.

**AC4:** The ChromaDB client is abstracted behind a single `_get_client()` function in `rag_service.py` — migrating to cloud ChromaDB (Azure, GCP, or Chroma Cloud) requires changing **only that function**.

**AC5:** `api/services/agent_service.py` system prompt is updated to allow document-grounded answers (remove the restriction on "strategy documents") and instruct the agent to prefer structured tools over RAG when both could answer.

**AC6:** All new files ≤150 lines. `build_rag_index.py` ≤150 lines, `rag_service.py` ≤150 lines, `rag_tools.py` ≤80 lines.

---

## Prerequisite Check (before coding)

- [ ] `OPENAI_API_KEY` is in `.env` at repo root (embeddings call `text-embedding-3-small`)
- [ ] `data_extract/rag_manifest.json` is created (Task T1 below)
- [ ] Pre-built index does NOT need to be rebuilt every time — run `build_rag_index.py` once, commit `data_extract/chroma_db/`

---

## Tasks / Subtasks

- [ ] T1: Create `data_extract/rag_manifest.json` — document scope (AC: 1)
  - [ ] T1.1: Write the JSON file listing documents to index (see Dev Notes for content)
  - [ ] T1.2: Verify every listed path exists under `data_extract/`

- [ ] T2: Update `requirements.txt` (AC: 1, 2)
  - [ ] T2.1: Add `chromadb`, `pypdf`, `python-pptx`, `openai` with comment `# Epic 2 (Story 2.4): RAG pipeline`
  - [ ] T2.2: Add `OPENAI_API_KEY=your-openai-key-here` to `.env.example`
  - [ ] T2.3: Run `pip install -r requirements.txt` — verify clean install

- [ ] T3: Create `scripts/build_rag_index.py` ≤150 lines (AC: 1)
  - [ ] T3.1: Load `data_extract/rag_manifest.json` — build list of `(abs_path, category)` tuples
  - [ ] T3.2: Implement `extract_pdf(path) -> list[dict]` — page-level chunks; each chunk: `{"text": str, "source": filename, "category": str, "page": int}`; skip pages with <50 chars
  - [ ] T3.3: Implement `extract_pptx(path) -> list[dict]` — slide-level chunks; each chunk: `{"text": title + "\n" + body, "source": filename, "category": str, "page": slide_num}`; skip blank slides
  - [ ] T3.4: Use `chromadb.utils.embedding_functions.OpenAIEmbeddingFunction(api_key=..., model_name="text-embedding-3-small")` as the collection's embedding function
  - [ ] T3.5: Create (or recreate) collection named `"neom_docs"` with `get_or_create_collection()`; use `PersistentClient(path="data_extract/chroma_db")`
  - [ ] T3.6: Upsert all chunks — use `f"{source}_{page}"` as the document ID (ensures idempotent re-runs)
  - [ ] T3.7: Print progress: `Indexed {n} chunks from {m} documents` at completion

- [ ] T4: Create `api/services/rag_service.py` ≤150 lines (AC: 2, 4)
  - [ ] T4.1: Implement `_get_client() -> chromadb.ClientAPI` — returns `PersistentClient(path=CHROMA_PATH)`
    - Add comment: `# PORTABILITY: Replace this function only to migrate to cloud ChromaDB`
    - For Chroma Cloud: `chromadb.CloudClient(tenant=..., database=..., api_key=...)`
    - For Azure/GCP HttpClient: `chromadb.HttpClient(host=os.environ["CHROMA_HOST"], ...)`
  - [ ] T4.2: Load collection at module level: `_collection = _get_client().get_collection("neom_docs", embedding_function=...)`; wrap in try/except — if collection missing, log warning and set `_collection = None`
  - [ ] T4.3: Implement `search(query: str, n_results: int = 5) -> list[dict]` — calls `_collection.query(query_texts=[query], n_results=n_results)`; returns list of `{"text", "source", "category", "page"}` dicts; returns `[]` if collection is None
  - [ ] T4.4: `CHROMA_PATH` resolved as `REPO_ROOT / "data_extract" / "chroma_db"` using `Path(__file__).parent.parent.parent`

- [ ] T5: Create `api/services/tools/rag_tools.py` ≤80 lines (AC: 3)
  - [ ] T5.1: Define `TOOL_SCHEMAS` list with one entry for `search_documents`:
    - description: "Search Ma'aden strategy, execution, investor relations, and risk documents. Use for questions about strategic plans, project status, earnings, board updates, or risk reports."
    - parameters: `{"query": {"type": "string", "description": "Search query in natural language"}}`
  - [ ] T5.2: Implement `search_documents(query: str) -> list[dict]` — calls `rag_service.search(query)` and returns results; returns `[{"text": "No matching documents found."}]` if empty

- [ ] T6: Register RAG tool in `api/services/tools/__init__.py` (AC: 3)
  - [ ] T6.1: Import `rag_tools.TOOL_SCHEMAS` and `rag_tools.search_documents`
  - [ ] T6.2: Append `rag_tools.TOOL_SCHEMAS` to the existing `TOOL_SCHEMAS` list (do NOT replace it)
  - [ ] T6.3: Add `"search_documents": rag_tools.search_documents` to `TOOL_REGISTRY` dict

- [ ] T7: Update agent system prompt in `api/services/agent_service.py` (AC: 5)
  - [ ] T7.1: Replace the current restriction `"For questions outside available data (Modules 5–10, strategy documents, project schedules)..."` with:
    ```
    "You have access to structured KPI tools and a document search tool. "
    "For KPI, actuals vs plan, and deviation questions: use get_bu_kpi_summary or get_all_bu_summaries. "
    "For strategy, execution, investor relations, board updates, or risk questions: use search_documents. "
    "Prefer structured tools over search_documents when both could answer. "
    "For questions truly outside all available tools, respond with exactly: " + repr(_NOT_SUPPORTED)
    ```
  - [ ] T7.2: Do NOT change anything else in `agent_service.py` — tool loop, error handling, streaming logic all stay identical

- [ ] T8: Run offline build and verify (AC: 1)
  - [ ] T8.1: Run `python scripts/build_rag_index.py` from repo root — should complete without errors
  - [ ] T8.2: Confirm `data_extract/chroma_db/` directory is created with ChromaDB files
  - [ ] T8.3: Verify chunk count printed is > 0

- [ ] T9: Verify end-to-end (AC: all)
  - [ ] T9.1: `uvicorn api.index:app --reload` — starts without errors (rag_service loads collection)
  - [ ] T9.2: Via query bar: ask "What does the strategic execution update say?" — agent should call `search_documents` and return grounded content
  - [ ] T9.3: Via query bar: ask "What is Phosphate EBITDA?" — agent should call `get_bu_kpi_summary`, NOT `search_documents` (structured tool preference)
  - [ ] T9.4: Existing tool calls (`get_bu_kpi_summary`, `get_all_bu_summaries`, `get_deviation_list`) still work — no regressions
  - [ ] T9.5: `curl http://localhost:8000/api/health` still returns `{"status": "ok"}`

- [ ] T10: Update `.gitignore` if needed (AC: 1)
  - [ ] T10.1: Check if `data_extract/chroma_db/` should be gitignored or committed. For the POC, **commit it** (pre-built index = zero cold-start latency). If >50MB, gitignore and document rebuild step in README.

---

## Dev Notes

### Portability design (CRITICAL — user requirement)

ChromaDB is local now. It will move to Azure/GCP/Chroma Cloud later. The **entire migration surface** is one function:

```python
# api/services/rag_service.py

def _get_client() -> chromadb.ClientAPI:
    """
    PORTABILITY: Replace this function only to migrate.
    Local (current):
      return chromadb.PersistentClient(path=str(CHROMA_PATH))
    Chroma Cloud:
      return chromadb.CloudClient(
          tenant=os.environ["CHROMA_TENANT"],
          database=os.environ["CHROMA_DATABASE"],
          api_key=os.environ["CHROMA_API_KEY"],
      )
    Azure/GCP self-hosted:
      return chromadb.HttpClient(host=os.environ["CHROMA_HOST"], port=8000)
    """
    return chromadb.PersistentClient(path=str(CHROMA_PATH))
```

The `EmbeddingFunction` also needs to move with it — keep it as a named constant `_EF` so it's easy to find and swap.

### `rag_manifest.json` content

```json
{
  "version": "1.0",
  "note": "Update this file to change which documents are indexed. Re-run scripts/build_rag_index.py after changes.",
  "documents": [
    {"path": "strategy/execution/20260409 - Current Activities and RAG with Baseline Dates.pdf", "category": "execution"},
    {"path": "strategy/execution/Strategic Execution Update - 12 March 2025 vF.pdf",             "category": "execution"},
    {"path": "strategy/budget_bp_2030/2026 Budget and BP 2026-2030 (Presented to the Board).pdf", "category": "strategy"},
    {"path": "strategy/full_document/NEOM Offsite Material - 6 Aug 2025 - v60.pptx",            "category": "strategy"},
    {"path": "strategy/enablers/20251111_Strategy Operationalization and Rewiring_Board_Enablers_v37.pptx", "category": "strategy"},
    {"path": "strategy/risk/20260409_April Excom_Risk update_vFinal.pptx",                        "category": "risk"},
    {"path": "investor_relations/earnings_calls/2025/q2-fy25-ec-presentation.pdf", "category": "investor_relations"},
    {"path": "investor_relations/earnings_calls/2025/q3-fy25-ec-presentation.pdf", "category": "investor_relations"},
    {"path": "investor_relations/annual_reports/2024-annual-report.pdf",                          "category": "investor_relations"},
    {"path": "investor_relations/earnings_calls/2024/english--ep-fy-24.pdf",                      "category": "investor_relations"}
  ]
}
```

Rationale for scope: Strategy docs (direct CEO relevance), recent earnings calls (2024-2025 performance context), 2024 annual report. Older annual reports and 2011-2022 earnings calls excluded — too much noise, CEO won't ask about 2015 copper prices.

### Embedding function setup

```python
import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

_EF = OpenAIEmbeddingFunction(
    api_key=os.environ["OPENAI_API_KEY"],
    model_name="text-embedding-3-small",
)
```

Use `_EF` both in `build_rag_index.py` (at index time) and `rag_service.py` (at query time). ChromaDB requires the same embedding function at both stages.

### Chunking approach

- **PDF**: One chunk per page. Filter pages with `len(text.strip()) < 50`. Max effective size is ~600 tokens/page — acceptable for `text-embedding-3-small`.
- **PPTX**: One chunk per slide. Concatenate slide title + `"\n"` + slide body text. Skip slides with combined `len < 30`.

No recursive sentence splitting — page/slide-level is accurate and simple. Overlap is not needed for this data volume.

### Environment variables needed

| Variable | Where set | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `.env` | Embeddings only (NOT for LLM calls — those use `LLM_API_KEY`) |
| `LLM_API_KEY` | `.env` | Already exists — LiteLLM / Claude calls |

Two separate keys. `OPENAI_API_KEY` is only needed at index build time and at query time for ChromaDB embedding lookups. If `OPENAI_API_KEY` is missing at runtime, `rag_service.py` logs a warning and `search()` returns `[]` — graceful degradation.

### Deployment topology reminder

FastAPI runs locally. `data_extract/chroma_db/` is a local directory. When moving to Azure, `CHROMA_PATH` becomes irrelevant — the `_get_client()` function changes. No other code changes.

### File size guardrails

- `scripts/build_rag_index.py` ≤150 lines
- `api/services/rag_service.py` ≤150 lines
- `api/services/tools/rag_tools.py` ≤80 lines

### Colleague boundaries — what NOT to touch

| File | Note |
|---|---|
| `api/services/agent_service.py` | One string change only (system prompt). Do not touch `stream_agent_response()` logic. |
| `api/services/tools/kpi_tools.py` | Do not touch (Story 2.1 owns it) |
| `api/routers/query.py` / `headlines.py` | Do not touch |
| Any `app/` or `components/` | ws:B — do not touch |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
None

### Completion Notes List
- All 10 manifest document paths verified as existing under `data_extract/` before writing manifest
- `OPENAI_API_KEY` not present in `.env` — index build (`scripts/build_rag_index.py`) was not run; `chroma_db/` not committed. Run the script manually once the key is available.
- `rag_service.py` gracefully degrades: logs a warning and returns `[]` when `OPENAI_API_KEY` is absent or collection missing — server starts cleanly without the key
- `api/services/agent_service.py` received exactly one string change (system prompt restriction clause); no logic changes

### File List
- `data_extract/rag_manifest.json` — created
- `requirements.txt` — chromadb, pypdf, python-pptx, openai added
- `.env.example` — OPENAI_API_KEY added
- `scripts/build_rag_index.py` — created (106 lines)
- `api/services/rag_service.py` — created (66 lines)
- `api/services/tools/rag_tools.py` — created (32 lines)
- `api/services/tools/__init__.py` — rag_tools registered (additive)
- `api/services/agent_service.py` — system prompt updated (one string change)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 2-4 → review

### Change Log
- 2026-04-13: Story 2.4 implemented on branch story/2-4-chromadb-rag
