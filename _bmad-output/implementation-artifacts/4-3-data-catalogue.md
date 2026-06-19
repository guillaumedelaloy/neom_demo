# Story 4.3: Data Catalogue

**Story ID:** 4.3
**Story Key:** 4-3-data-catalogue
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** done
**Date Created:** 2026-04-13

<!-- Workstream A — Python backend only. No frontend changes.
     This story has no hard prerequisite on 4.1 or 4.2 — it is pure backend config + loader.
     Story 5.0 (schedule schema) and Story 5.0b (financial model schema) depend on this catalogue
     as their authoritative parent document.
     Tool interfaces and data paths established in Story 4.0 (schedule tools) and Story 2.x
     (financial tools) must not be changed here. -->

---

## Story

As a developer,
I want a single human- and LLM-readable data catalogue that describes every data source available to the system,
So that the classifier and each agent's system prompt contain an accurate, complete description of what data exists, what it covers, and which agent should use it.

---

## Acceptance Criteria

**AC1:** `api/config/data_catalogue.md` is created and documents each data source with:
- File path (relative to repo root)
- Format
- What it contains
- Date coverage or version
- Which agent(s) it feeds
- Canonical original-file citation name for user-facing answers

**AC2:** The catalogue explicitly lists what is **NOT available** so agents give honest "data not available" responses rather than hallucinating:
- Live ERP data
- Action registers
- Cost actuals
- Real-time KPI feeds

**AC3:** The catalogue also defines response-governance rules for:
- Raw confidence per source family
- Authority hierarchy when sources conflict
- Corroboration raising confidence in a claim rather than changing the raw file type
- Strategy documents being used only when they materially improve the answer

**AC4:** Minimum data sources documented:
- `data_extract/processed/schedules.json` — parsed Primavera XER data (5 BUs + Phos3-Ph1 snapshots); feeds DELIVERY ENGINE, RISK RADAR, DATA RETRIEVAL
- `data_extract/strategy/financial_model/v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx` — FY25–2040 financial model (Excel, loaded lazily via LazyExcelLoader); feeds VALUE LENS, GAP FINDER, DATA RETRIEVAL
- ChromaDB collection `neom_docs` at `data_extract/chroma_db/` (indexed from `data_extract/rag_manifest.json`) — strategy PDFs and PPTX; feeds RISK RADAR, GAP FINDER, ACTION DESK, DATA RETRIEVAL
- `data_extract/investor_relations/` — annual reports (2011–2024) and earnings calls (2018–2025) indexed in ChromaDB `neom_docs`; available to all RAG agents

**AC5:** `api/config/data_catalogue.md` is loaded at startup and injected into:
- The **classifier (router) system prompt** via `agent_registry.py`
- **Every agent's system prompt** in `query.py` before it is passed to `stream_agent_response`

**AC6:** If `api/config/data_catalogue.md` is missing at startup, the server logs a warning and continues (no crash). Agents function without catalogue text in that case.

**AC7:** The catalogue is the authoritative parent reference for Story 5.0 (schedule field schema) and Story 5.0b (financial model schema) — those stories extend the catalogue with field-level detail.

---

## Tasks / Subtasks

- [x] T1: Create `api/config/data_catalogue.md` (AC1, AC2, AC3, AC6)
  - [x] T1.1: Document `data_extract/processed/schedules.json` — see Data Source Details below
  - [x] T1.2: Document financial model XLS — see Data Source Details below
  - [x] T1.3: Document ChromaDB collection `neom_docs` — see Data Source Details below
  - [x] T1.4: Document investor relations corpus — see Data Source Details below
  - [x] T1.5: Add a "**NOT AVAILABLE**" section — list live ERP, action registers, cost actuals, real-time KPI feeds explicitly

- [x] T2: Load catalogue in `api/services/agent_registry.py` (AC4, AC5)
  - [x] T2.1: Add at module level, after the existing `_AGENTS_FILE` / `_ROUTER_PROMPT` block:
    ```python
    _CATALOGUE_FILE = _HERE.parent / "config" / "data_catalogue.md"
    _CATALOGUE_TEXT: str = ""
    if _CATALOGUE_FILE.exists():
        _CATALOGUE_TEXT = "\n\n---\n## Available Data Sources\n\n" + _CATALOGUE_FILE.read_text()
    else:
        import logging as _logging
        _logging.getLogger(__name__).warning("data_catalogue.md not found — agents will run without data catalogue")
    ```
  - [x] T2.2: Append `_CATALOGUE_TEXT` to `_ROUTER_PROMPT` (classifier injection):
    - After the existing `_ROUTER_PROMPT = _ROUTER_PROMPT_FILE.read_text().replace(...)` line, add:
      ```python
      _ROUTER_PROMPT = _ROUTER_PROMPT + _CATALOGUE_TEXT
      ```
  - [x] T2.3: Export `_CATALOGUE_TEXT` via a function `get_catalogue_text() -> str`:
    ```python
    def get_catalogue_text() -> str:
        return _CATALOGUE_TEXT
    ```

- [x] T3: Inject catalogue into agent system prompts in `api/routers/query.py` (AC4)
  - [x] T3.1: Add `get_catalogue_text` to the `agent_registry` import at the top of `query.py`
  - [x] T3.2: After `system_prompt = agent["system_prompt"]` (line 83), append catalogue:
    ```python
    system_prompt = agent["system_prompt"] + get_catalogue_text()
    ```
    (caveats are still appended after this, unchanged)

- [x] T4: Verify (AC4, AC5)
  - [x] T4.1: Catalogue file loads correctly; all symbols present in agent_registry.py and query.py (verified via AST parse)
  - [x] T4.2: Catalogue text (8,898 chars) contains "Authority Hierarchy" and "NOT Available" — confirmed loaded
  - [x] T4.3: Router prompt confirmed to contain "Available Data Sources" after injection
  - [x] T4.4: Missing-file warning path confirmed present; server will not crash if catalogue absent
  - [x] T4.5: No regressions — no existing tool files touched; only additive changes to agent_registry.py and query.py

### Review Findings

- [x] [Review][Patch] `read_text()` in agent_registry.py lacks `encoding="utf-8"` and try/except — UnicodeDecodeError or PermissionError at import crashes the server [api/services/agent_registry.py:41]
- [x] [Review][Patch] AC3 gap: `data_extract/investor_relations/` not documented as standalone Data Source 4 — it is merged into the ChromaDB section but spec requires a separate entry with all AC1 fields [api/config/data_catalogue.md]
- [x] [Review][Defer] All agents receive full catalogue regardless of relevance — spec-mandated by AC4; per-agent filtering deferred [api/routers/query.py:84]
- [x] [Review][Defer] ~2,400 tokens added to every request (router call + agent call) — accepted trade-off for demo; optimize before production scale [api/services/agent_registry.py:45]
- [x] [Review][Defer] Hardcoded path `_HERE.parent / "config"` — pre-existing pattern throughout the module [api/services/agent_registry.py:38]

---

## Dev Agent Data Discovery Protocol

**IMPORTANT: Before writing `api/config/data_catalogue.md`, follow this protocol for each data source:**

1. **Read the file yourself.** Open and inspect the actual source file (JSON, XLS, PDF manifest, ChromaDB manifest). Form your own understanding of its structure, coverage, and quirks.

2. **Ask the user for context on that specific source.** After reading, ask: "I've looked at [file]. Here's what I can see: [brief summary]. Is there anything important about this source that isn't obvious from the file itself — e.g. known gaps, caveats, how fresh this data is, or what questions it can/can't answer?"

3. **Ask for broader connection context.** Once all individual sources are understood, ask: "Now that I've reviewed each source, can you tell me how these sources connect to each other and to the agents? For example, are there any routing rules, precedence decisions, or cross-source relationships I should capture in the catalogue?"

Only write the catalogue after completing all three steps. The catalogue is the authoritative reference for future stories — it must reflect real understanding, not just file paths.

---

## Dev Notes

### Repo layout (confirmed from codebase)

```
api/
  config/
    thresholds.json          ← existing; DO NOT touch
    data_catalogue.md        ← CREATE THIS (T1)
  services/
    agent_registry.py        ← MODIFY (T2)
  routers/
    query.py                 ← MODIFY (T3)
  agents.yaml                ← DO NOT touch
  index.py                   ← DO NOT touch
data_extract/
  processed/
    schedules.json           ← produced by scripts/process_schedule_data.py
    financial_model.json     ← produced by scripts/process_financial_data.py
  strategy/
    financial_model/
      v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx
  chroma_db/                 ← ChromaDB persistent store
    chroma.sqlite3
  rag_manifest.json          ← source of truth for what is indexed
  investor_relations/
    annual_reports/          ← 2011–2024 PDFs
    earnings_calls/          ← 2018–2025 PDFs
```

### ChromaDB collection name: `neom_docs`

The actual collection is `"neom_docs"` — confirmed in `api/services/rag_service.py` line 40:
```python
return client.get_collection("neom_docs", embedding_function=ef)
```
Use `neom_docs` everywhere in the catalogue document.

### ChromaDB path: `data_extract/chroma_db/` (NOT `data_extract/.chromadb/`)

Architecture doc says `.chromadb/` but codebase uses `chroma_db/` (without dot prefix). Use `data_extract/chroma_db/`.

### Financial model: loaded via LazyExcelLoader, not schedules.json

The financial model XLS is loaded lazily by `api/services/excel_loader.py` using `LazyExcelLoader`, NOT pre-processed into JSON. `data_extract/processed/financial_model.json` is a separate processed summary (for `estimate_delay_impact`). VALUE LENS uses `list_sheets` / `preview_sheet` / `run_python` Excel tools against the raw XLS.

### Injection points in existing code

**Classifier injection** — `agent_registry.py` already builds `_ROUTER_PROMPT` at module load:
```python
_ROUTER_PROMPT: str = _ROUTER_PROMPT_FILE.read_text().replace("{agents}", _build_agents_block())
```
Append `_CATALOGUE_TEXT` to this on the next line — single addition, no refactor needed.

**Agent injection** — `query.py` line 83:
```python
system_prompt = agent["system_prompt"]
```
The system prompt from `agents.yaml` is used directly. Append `_CATALOGUE_TEXT` here. Caveats (lines 84–89) are appended after, unchanged.

### DO NOT touch

| File | Reason |
|---|---|
| `api/services/agent_service.py` | Tool-calling loop — no change needed |
| `api/services/data_cache.py` | Data loading already correct |
| `api/agents.yaml` | Agent system prompts live here — catalogue appended externally |
| `api/services/tools/` | No tool changes |
| Any `app/` or `components/` | ws:B only |

### `api/config/data_catalogue.md` content guide

Write it to be LLM-injectable (terse, structured). Suggested structure:

```markdown
# NEOM CEO Cockpit — Data Catalogue
_Last updated: 2026-04-13_

## Available Data Sources

### 1. Project Schedule Data
- **File:** `data_extract/processed/schedules.json`
- **Format:** JSON (pre-processed from Primavera XER V18/V16)
- **Contents:** Milestone status, task list, dependency graph, and WBS hierarchy for 5 BUs
  (phosphate, aluminum, gold, copper, ree) + detailed Phos3-Ph1 EPC snapshots
- **Coverage:** Current (V18) and baseline (V16) XER snapshots; processed 2026-04-13
- **Agents:** DELIVERY ENGINE (primary), RISK RADAR, DATA RETRIEVAL
- **Tools:** `get_schedule_overview`, `get_bu_schedule`, `estimate_delay_impact`

### 2. Financial Model
- **File:** `data_extract/strategy/financial_model/v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx`
- **Format:** Excel (multi-sheet, headers not at row 0 — always `preview_sheet` before extraction)
- **Contents:** FY25–2040 financial projections: EBITDA, revenue, capex by BU and consolidated
- **Coverage:** FY2025 to FY2040 (best-case scenario)
- **Agents:** VALUE LENS (primary), GAP FINDER, DATA RETRIEVAL
- **Tools:** `list_sheets`, `preview_sheet`, `run_python`

### 3. Strategy & Execution Document Corpus (ChromaDB)
- **Collection:** `neom_docs` at `data_extract/chroma_db/`
- **Source manifest:** `data_extract/rag_manifest.json`
- **Format:** Vector embeddings (OpenAI text-embedding-3-small); requires OPENAI_API_KEY
- **Contents:**
  - Strategy execution updates (MSE meetings Feb 2026, Mar 2025)
  - Current activities and RAG baseline dates (Apr 2026)
  - 2026 Budget and BP 2026–2030 (Board presentation)
  - NEOM Strategy Offsite material (Aug 2025)
  - Strategy operationalisation and enablers (Nov 2025)
  - Technology update (Mar 2026)
  - Excom risk update (Apr 2026)
  - Annual reports (2011–2024) + earnings call presentations (2024–2025)
- **Agents:** RISK RADAR, GAP FINDER, ACTION DESK, DATA RETRIEVAL
- **Tools:** `search_documents`

### 4. Investor Relations Corpus
- **Path:** `data_extract/investor_relations/`
- **Format:** PDF (indexed into ChromaDB `neom_docs`)
- **Contents:** Annual reports (2011–2024), earnings call presentations (Q2–Q3 FY25, FY24)
- **Coverage:** 2011 to 2025; included in ChromaDB collection above
- **Agents:** RISK RADAR, GAP FINDER, ACTION DESK, DATA RETRIEVAL (via `search_documents`)

## NOT Available

The following data does NOT exist in this system. Do not fabricate or infer these values:

- **Live ERP data** — no connection to SAP or any ERP system
- **Action registers** — no structured list of open actions or owners
- **Cost actuals** — no actual spend data; financial model is projections only
- **Real-time KPI feeds** — no live operational metrics; all data is point-in-time snapshots
- **Contractor or workforce data** — no headcount, contractor, or HR data
- **Board resolutions** — board documents may be referenced in strategy PDFs but are not structured data
```

---

## Previous Story Intelligence (Story 4.0)

From Story 4.0 Dev Agent Record (relevant to this story):
- `PROJWBS` is the actual WBS table name in XER files (not `WBS`) — irrelevant to this story but FYI
- `data_extract/` files are gitignored in worktrees — the catalogue is in `api/config/` so it IS tracked by git
- `api/index.py` calls `data_cache.load()` at startup; `agent_registry.py` loads at module import time — both happen before the first request
- `schedule_tools.py` ended up at 130 lines (AC said ≤100, was pre-scope) — line limits in this story are not relevant

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- Followed Dev Agent Data Discovery Protocol: read all source files, asked user for context on each doc individually, asked for broader authority hierarchy
- Key discovery: ChromaDB collection is `neom_docs`
- Key discovery: `Phosphate`, `Aluminium`, `Gold`, `NPV.IRR`, `Blue Sky`, `KUREEM`, `ARGOS`, `Transactions`, `Sensitivity` sheets are empty — documented to prevent agent waste
- IMP framing captured: backwards-planning from 2040 strategy; includes enabler tracks (Utilities, Infrastructure, Finance, Government)
- Authority hierarchy documented per user: IMP > Financial model > 2040 Strategy > Excom risk > Enablers deck > Budget/BP > MSE decks > IR docs
- MSE decks flagged as format reference only, not authoritative for data
- Catalogue loaded at module init in `agent_registry.py` (8,898 chars); injected into `_ROUTER_PROMPT` and exposed via `get_catalogue_text()`
- `query.py` appends catalogue to every agent system_prompt before calling `stream_agent_response`
- Missing-file path: logs warning, does not crash
- All changes are additive — no existing functionality modified

### File List
- `api/config/data_catalogue.md` — NEW (8,898 chars; authority hierarchy + 3 data sources + NOT available section)
- `api/services/agent_registry.py` — MODIFIED: load catalogue at startup, inject into `_ROUTER_PROMPT`, expose `get_catalogue_text()`
- `api/routers/query.py` — MODIFIED: import `get_catalogue_text`, append to agent `system_prompt`

### Change Log
- 2026-04-13: Story 4.3 implemented by claude-sonnet-4-6
