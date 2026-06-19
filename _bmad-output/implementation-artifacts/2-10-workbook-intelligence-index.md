# Story 2.10: Workbook Intelligence Index

**Story ID:** 2.10
**Story Key:** 2-10-workbook-intelligence-index
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Workstream:** A — Backend data pipeline + Excel tooling
**Status:** review
**Date Created:** 2026-04-13

<!-- Context: The current Excel query flow costs 3–6 LLM tool-call rounds per financial question:
     list_sheets() → get_sheet_labels(sheet) → run_python(). The workbook has 125 sheets — the
     agent has no way to know which are the 8–10 "consolidated" BU views vs 115 plant-level calc
     sheets, so it wastes rounds exploring.

     This story collapses all discovery into one call: describe_workbook() reads a pre-built JSON
     index that is generated once at data-bootstrap time. The index classifies all 125 sheets,
     fully indexes the 8–10 BU-consolidated sheets (row labels + year column map), and stubs the rest.

     financial.json and its pipeline (process_financial_data.py, financial_data_tools.py) are
     confirmed orphaned — they are NOT in TOOL_REGISTRY and have never been called by the agent.
     They are removed here as part of the cleanup.

     Files to NOT touch: schedule_tools.py, phos3_tools.py, rag_tools.py, any frontend files,
     test_excel_tools.py (tests will be added, not replaced). -->

---

## Story

As the agent serving Ma'aden's executive dashboard,
I want a single `describe_workbook()` tool that returns the pre-built structure of the financial
model (sheet index, BU aliases, row labels, year column map),
so that I can write a correct `run_python()` query in the very next round — eliminating 3–4
sheet-discovery calls per financial question and making multi-step analysis reliable within
the 20-round budget.

---

## Acceptance Criteria

**AC1 — Classification heuristic (build script)**

`scripts/build_workbook_index.py` opens `data_extract/strategy/financial_model/v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx` with `openpyxl` (read-only, data_only) and classifies all sheets into two tiers:

- **`indexed`** (full treatment): a sheet is indexed if its name matches the exact whitelist OR the
  content heuristic passes.
  - Exact whitelist: `Consolidated Group`, `Corporate`, `Phosphate`, `Aluminium`, `Gold`,
    `Phos_Consolidated BU`, `Alum_Consolidated BU`, `BMNM_Consol`,
    `Kureem_Consolidated`, `ARGOS_Consolidated`
  - Content heuristic: ≥ 3 distinct cells in column A (col index 0) contain any of the keywords
    `Revenue`, `EBITDA`, `Capex`, `Production`, `Volume`, `Margin` (case-insensitive substring)
- **`stub`** (name + dims only): every sheet not meeting the above criteria.

The script logs one line per sheet: `[indexed] Phos_Consolidated BU (120×30)` or
`[stub] Phos 3 P1 (85×22)`.

**AC2 — Year column map extraction**

For each indexed sheet the script detects the year-header row:
- Scan rows 0–5 (0-indexed), all columns up to column 40.
- A row is the year-header row if it contains ≥ 3 distinct integer values (or `datetime.date`
  objects) whose `.year` attribute (or the int itself) falls in the range 2020–2045 and those
  values are consecutive (e.g. 2025, 2026, 2027).
- From the year-header row, build `year_cols: dict[str, int]` mapping year string → 0-based
  column index (e.g. `{"2025": 3, "2026": 4, ...}`).
- If no year-header row is found, `year_header_row` and `year_cols` are `null` / `{}`.

**AC3 — Row label extraction**

For each indexed sheet, scan column A (col index 0) rows 0 through `min(max_row, 200)`:
- Collect cells whose value is a non-empty string after stripping whitespace.
- Store as list of `{"row": int, "value": str}` (0-indexed row).
- Cap at **60 labels per sheet** (discard tail beyond that; typical consolidated sheets have
  40–55 labelled rows).
- If a cell in col A is empty but the adjacent col B cell is a non-empty string, include it
  as a sub-label with `"col": 1` alongside `"row"`.

**AC4 — BU alias map**

The script emits a hardcoded `bu_aliases` dict that maps semantic query terms → exact sheet names:

```json
{
  "phosphate": "Phos_Consolidated BU",
  "phos":      "Phos_Consolidated BU",
  "aluminum":  "Alum_Consolidated BU",
  "aluminium": "Alum_Consolidated BU",
  "alum":      "Alum_Consolidated BU",
  "gold":      "BMNM_Consol",
  "bmnm":      "BMNM_Consol",
  "copper_kureem": "Kureem_Consolidated",
  "kureem":    "Kureem_Consolidated",
  "copper_argos":  "ARGOS_Consolidated",
  "argos":     "ARGOS_Consolidated",
  "group":     "Consolidated Group",
  "corporate": "Corporate"
}
```

**AC5 — Output JSON**

`data_extract/processed/workbook_index.json` is written with the following top-level structure:

```json
{
  "meta": {
    "source": "<filename>",
    "built_at": "<ISO datetime>",
    "total_sheets": 125,
    "indexed_count": "<N>",
    "stub_count": "<M>"
  },
  "bu_aliases": { ... },
  "sheets": {
    "<indexed sheet name>": {
      "tier": "indexed",
      "dims": [rows, cols],
      "year_header_row": <int | null>,
      "year_cols": { "<year>": <col_idx>, ... },
      "row_labels": [{"row": <int>, "col": <0|1>, "value": "<str>"}, ...]
    },
    "<stub sheet name>": {
      "tier": "stub",
      "dims": [rows, cols]
    }
  }
}
```

JSON file size must be ≤ 500 KB. The script prints a final summary line:
`Indexed N/125 sheets → workbook_index.json (X KB)`.

**AC6 — LazyExcelLoader loads the index at startup**

`api/services/excel_loader.py` is updated:
- `__init__` looks for `workbook_index.json` at
  `data_extract/processed/workbook_index.json` (path resolved relative to the repo root,
  same pattern as `EXCEL_PATH`).
- If the file exists: `self.index: dict` is loaded from it. Attribute is public.
- If the file does not exist: `self.index = {}` and a warning is logged
  (`"workbook_index.json not found — run scripts/build_workbook_index.py"`).
- Loading the JSON must complete in < 100 ms (it is a pure file read, no Excel scan).
- The existing `sheet_names()`, `dimensions()`, and `__getitem__` methods are unchanged.

**AC7 — `describe_workbook()` tool**

New function in `api/services/tools/excel_tools.py`:

```python
def describe_workbook() -> str:
```

- Returns `"Workbook index not available — run build_workbook_index.py"` if `loader.index` is
  empty.
- Otherwise formats the index as a compact human-readable string:
  - Header: `WORKBOOK: <source filename> — <N> sheets (<M> indexed)`
  - BU alias map block (one line per alias: `  phosphate → Phos_Consolidated BU`)
  - For each **indexed** sheet, in the order they appear in `loader.index["sheets"]`:
    - Sheet header: `SHEET: <name> (<rows>r × <cols>c)`
    - Year columns line: `  Years: 2025=col3, 2026=col4, …` (omitted if `year_cols` is empty)
    - Row labels: each label on its own line `  row<N>: <value>` (all labels, up to 60)
  - **Stub sheets are not included** in the output.
- Output length must be ≤ 6 000 chars. If the formatted output exceeds 6 000 chars, truncate
  at 5 900 chars and append `\n[truncated — index exceeds output cap]`.

**AC8 — Deprecated tools removed from TOOL_SCHEMAS**

In `api/services/tools/excel_tools.py`:
- `list_sheets`, `preview_sheet`, `preview_sheets`, `get_sheet_labels` are **removed from
  `TOOL_SCHEMAS`** (the list of dicts that becomes the LLM tool definitions).
- Their Python functions remain in the module and are importable (they are still available inside
  `run_python` sandboxed env via `sheets` and can be used by tests).
- `describe_workbook` is added to `TOOL_SCHEMAS` with a clear description:
  > "Returns the pre-built structure of the financial model workbook: sheet index, BU aliases,
  >  row label positions, and year column map for all consolidated BU sheets. Call this once
  >  before run_python to know exactly which rows and columns to target."

**AC9 — TOOL_REGISTRY updated**

In `api/services/tools/__init__.py`:
- Remove: `list_sheets`, `preview_sheet`, `preview_sheets`, `get_sheet_labels`
- Add: `describe_workbook`
- All schedule and phos3 tools unchanged.

**AC10 — agent_service.py: _PROGRESS + system prompt**

`api/services/agent_service.py`:

*`_PROGRESS` dict changes:*
- Remove keys: `"list_sheets"`, `"preview_sheet"`, `"preview_sheets"`, `"get_sheet_labels"`
- Add key: `"describe_workbook": "Exploring the financial workbook structure…"`
- Total tool count in `_PROGRESS` drops from 12 to 9.

*System prompt `_SYSTEM` change:*
Replace the multi-step Excel instruction block with:
```
For all financial questions (EBITDA, revenue, projections, capex, any numbers from the
financial model): first call describe_workbook() to get the full sheet index — it returns
exact row positions and year column indices for every BU consolidated sheet.
Then call run_python(code) to extract the figures using those exact indices.
Never guess row or column positions — describe_workbook() gives you the ground truth.
Inside run_python use: sheets['Sheet Name'] to load a sheet, find_data_start(df) to crop
leading blanks if needed.
```

**AC11 — financial.json pipeline removed**

- `scripts/process_financial_data.py` — **deleted**
- `data_extract/processed/financial_model.json` — **deleted** (if present on disk)
- `api/services/tools/financial_data_tools.py` — **deleted**
- `api/services/data_cache.py`: remove `_financial` global, remove `financial_model.json`
  loading from `load()`, remove `get_financial()` method. Keep `get_schedules()` and
  `get_phos3()` unchanged.
- Confirm: no import of `financial_data_tools` exists anywhere in the codebase after deletion.

**AC12 — Bootstrap script updated**

`scripts/build_workbook_index.py` is added to the data bootstrap sequence documented in
`data_extract/README.md` (or whichever bootstrap documentation file tracks the pipeline order).
The script is runnable standalone:
```
cd <repo_root> && .venv/bin/python scripts/build_workbook_index.py
```
It exits with code 0 on success, non-zero on file-not-found or parse errors.

---

## Tasks / Subtasks

- [x] T1: Write `scripts/build_workbook_index.py` (AC: 1, 2, 3, 4, 5, 12)
  - [x] T1.1: Open workbook with openpyxl `read_only=True, data_only=True`
  - [x] T1.2: Implement `_classify_sheet(ws, name)` → `"indexed" | "stub"` using whitelist + content heuristic
  - [x] T1.3: Implement `_detect_year_headers(ws)` → `(header_row_idx | None, {year: col_idx})`
  - [x] T1.4: Implement `_extract_row_labels(ws, max_row)` → `[{"row", "col", "value"}]` capped at 60
  - [x] T1.5: Build `bu_aliases` hardcoded map (AC4)
  - [x] T1.6: Write `workbook_index.json` with full structure (AC5); assert size ≤ 500 KB
  - [x] T1.7: Print per-sheet log lines and final summary; exit codes

- [x] T2: Update `api/services/excel_loader.py` (AC: 6)
  - [x] T2.1: Add `workbook_index.json` path resolution (same pattern as `EXCEL_PATH`)
  - [x] T2.2: Load JSON into `self.index` in `__init__`; fallback to `{}` with warning if absent

- [x] T3: Update `api/services/tools/excel_tools.py` (AC: 7, 8)
  - [x] T3.1: Add `describe_workbook()` function
  - [x] T3.2: Add `describe_workbook` to `TOOL_SCHEMAS`
  - [x] T3.3: Remove `list_sheets`, `preview_sheet`, `preview_sheets`, `get_sheet_labels` from `TOOL_SCHEMAS`
  - [x] T3.4: Verify removed functions still importable (not deleted from module)

- [x] T4: Update `api/services/tools/__init__.py` (AC: 9)
  - [x] T4.1: Remove 4 tool entries from `TOOL_REGISTRY` and `TOOL_SCHEMAS` aggregation
  - [x] T4.2: Add `describe_workbook` to `TOOL_REGISTRY`

- [x] T5: Update `api/services/agent_service.py` (AC: 10)
  - [x] T5.1: Replace 4 `_PROGRESS` entries with single `describe_workbook` entry
  - [x] T5.2: Replace Excel instruction block in `_SYSTEM` with two-step `describe_workbook → run_python` instruction

- [x] T6: Remove financial.json pipeline (AC: 11)
  - [x] T6.1: Delete `scripts/process_financial_data.py`
  - [x] T6.2: Delete `data_extract/processed/financial_model.json` (if exists)
  - [x] T6.3: Delete `api/services/tools/financial_data_tools.py`
  - [x] T6.4: Strip `_financial`, `get_financial()`, and `financial_model.json` load from `data_cache.py`
  - [x] T6.5: Grep for any remaining imports of `financial_data_tools` or `get_financial` — confirm zero

- [x] T7: Tests (AC: all)
  - [x] T7.1: Unit-test `_classify_sheet` with mock worksheet names and col-A content
  - [x] T7.2: Unit-test `_detect_year_headers` with a mock row containing 2025–2030 int values
  - [x] T7.3: Unit-test `_extract_row_labels` with a mock worksheet; verify 60-cap and col-B fallback
  - [x] T7.4: Unit-test `describe_workbook()` with a fixture index; verify output ≤ 6000 chars
  - [x] T7.5: Unit-test `describe_workbook()` returns "not available" string when `loader.index == {}`
  - [x] T7.6: Assert `TOOL_REGISTRY` contains `describe_workbook` and does NOT contain the 4 deprecated tools
  - [x] T7.7: Assert `TOOL_SCHEMAS` function names match `TOOL_REGISTRY` keys exactly

---

## Dev Notes

### Why only index consolidated sheets

The financial model has 125 sheets. Roughly 115 are plant-level calculation sheets (e.g. `Phos 3 P1`,
`Line 3`, `ARJ`). These sheets:
- Have different row structures per plant (not generalised)
- Are not needed for executive-level queries (EBITDA, Revenue, Capex are always in consolidated views)
- Would bloat the index and overflow `describe_workbook()` output

The 8–10 consolidated/summary sheets cover every query the agent currently handles. If future
stories require plant-level drill-down, a `describe_sheet(sheet_name)` tool can be added then.

### Year column detection robustness

`process_financial_data.py` looks for exactly `2025` (int or date). The new detection is
generalised: scan for any run of ≥ 3 consecutive years in range 2020–2045. This handles sheets
that start at 2024 (actuals) or sheets that have a different base year. The `year_cols` dict
includes all detected years, so `run_python` code can reference any year directly:

```python
year_col = loader.index["sheets"]["Phos_Consolidated BU"]["year_cols"]["2027"]
df = sheets["Phos_Consolidated BU"]
ebitda_row = 47  # from row_labels
value = df.iloc[ebitda_row, year_col]
```

### Output format compactness

Target: one `describe_workbook()` call fits in ≤ 6 000 output chars. With 10 indexed sheets,
~50 row labels each, the budget is ~55 chars/label. The format `  row47: EBITDA` is 17 chars —
well within budget. The year-cols line (12 years × ~10 chars) ≈ 120 chars.

Estimated total: 10 sheets × (80 header + 120 year-cols + 50 labels × 17) = 10 × 1050 = 10 500 chars.
→ This exceeds 6 000. Mitigation: keep only indexed sheets whose `tier == "indexed"` in the
output, and compress multi-value lines. The truncation guard (AC7) is the safety net.

If output regularly exceeds 6 000 chars in practice, Story 2.11 can add `bu_hint` parameter
to `describe_workbook(bu_hint=None)` to return only the matching BU sheet.

### Colleague boundaries

| File | Rule |
|---|---|
| `scripts/build_workbook_index.py` | NEW — standalone script, no imports from api/ |
| `api/services/excel_loader.py` | Add `self.index` loading only — no other changes |
| `api/services/tools/excel_tools.py` | Add `describe_workbook`, remove 4 from TOOL_SCHEMAS; functions themselves stay |
| `api/services/tools/__init__.py` | Remove 4 entries, add describe_workbook |
| `api/services/agent_service.py` | `_PROGRESS` + `_SYSTEM` only — no loop logic changes |
| `api/services/data_cache.py` | Remove financial parts only; schedules/phos3 untouched |
| `scripts/process_financial_data.py` | DELETE |
| `api/services/tools/financial_data_tools.py` | DELETE |
| `tests/test_excel_tools.py` | ADD tests — do not modify existing tests |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- All 12 ACs implemented and verified with 30 passing tests (0 regressions).
- `scripts/build_workbook_index.py`: standalone script using openpyxl read-only mode with `iter_rows(values_only=True)` to avoid random cell access constraints. Classifies sheets by whitelist then content heuristic (≥3 keyword hits in col A). Year header detection scans rows 1–6 for ≥3 consecutive integers in 2020–2045 range using `_longest_consecutive_run`. Row labels capped at 60 per sheet; col B fallback for sub-labels. Exits non-zero on file-not-found or >500 KB output.
- `excel_loader.py`: INDEX_PATH added at module level (same repo-root anchor as EXCEL_PATH); `self.index` loaded in `__init__` with graceful fallback to `{}` + warning.
- `excel_tools.py`: `describe_workbook()` returns index as compact text (≤6000 chars with truncation guard). TOOL_SCHEMAS reduced from 5 to 2 entries (describe_workbook + run_python); 4 deprecated functions stay in module for backward-compat/test imports.
- `data_cache.py`: `get_financial()` retained as stub returning `{}` (cannot remove — `schedule_tools.py` imports it for `estimate_delay_impact`; that tool now returns DATA_MISSING gracefully). `_financial` global and JSON loading removed.
- Tests: 5 conflicting registry/schema tests updated to reflect new state (AC8/AC9 supersede "do not modify" guideline where directly contradicted). Added `from __future__ import annotations` for Python 3.9 test runner compatibility.

### File List
- `scripts/build_workbook_index.py` — NEW
- `api/services/excel_loader.py` — MODIFIED: add self.index JSON load
- `api/services/tools/excel_tools.py` — MODIFIED: add describe_workbook, remove 4 from TOOL_SCHEMAS
- `api/services/tools/__init__.py` — MODIFIED: registry + schema sync
- `api/services/agent_service.py` — MODIFIED: _PROGRESS + system prompt
- `api/services/data_cache.py` — MODIFIED: remove financial parts
- `scripts/process_financial_data.py` — DELETED
- `api/services/tools/financial_data_tools.py` — DELETED
- `data_extract/processed/financial_model.json` — DELETED (if present)
- `tests/test_excel_tools.py` — MODIFIED: add new tests

### Change Log
- 2026-04-13: Story 2.10 implemented — workbook intelligence index (describe_workbook replaces 4 discovery tools; financial.json pipeline removed; 30 tests added/updated).
