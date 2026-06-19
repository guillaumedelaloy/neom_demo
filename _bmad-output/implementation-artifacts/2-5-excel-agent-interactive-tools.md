# Story 2.5: Excel Agent Interactive Tools

**Story ID:** 2.5
**Story Key:** 2-5-excel-agent-interactive-tools
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-13

<!-- Workstream A — Python backend only. No frontend changes.
     PREREQUISITE: Story 2.1 must be done (openpyxl in requirements, excel path confirmed).
     This story adds an interactive Excel access layer ON TOP of the existing pre-computed JSON tools.
     Do NOT remove or modify financial_data_tools.py — this is purely additive.
     The LazyExcelLoader is a module-level singleton; it opens the Excel file handle at startup (metadata only).
     The run_python sandbox uses exec() with a restricted namespace — no file I/O, no network.
     narrative_service.py is currently modified (uncommitted) — do NOT touch it.
     ws:B, ws:C, ws:D are unaffected. -->

---

## Story

As a developer,
I want an agent-callable Excel exploration layer (`list_sheets`, `preview_sheet`, `run_python`) backed by a lazy-loading Excel reader,
so that the AI agent can answer ad-hoc financial model queries not covered by the pre-computed JSON — exploring any of the ~140 sheets on demand without pre-processing or code changes.

---

## Acceptance Criteria

**AC1:** `api/services/excel_loader.py` exports:
- `LazyExcelLoader` class — opens `pd.ExcelFile` handle at startup (no data read), caches parsed sheets on first access, all parsed with `header=None`
- `find_data_start(df: pd.DataFrame) -> pd.DataFrame` — crops leading all-NaN rows and columns, resets index to 0
- `loader` — module-level singleton of `LazyExcelLoader` pointing to the master Excel file; set to `None` if the file is missing (import must not raise)

**AC2:** `LazyExcelLoader.dimensions()` returns `{sheet_name: (max_row, max_col)}` for all sheets using openpyxl worksheet metadata via `self._xl.book[name]` — no sheet data loaded.

**AC3:** `api/services/tools/excel_tools.py` registers three tools:
- `list_sheets() -> str` — calls `loader.dimensions()`, returns one line per sheet: `"{name} — {r}r × {c}c"`
- `preview_sheet(sheet_name: str, n_rows: int = 15) -> str` — loads one sheet via `loader[sheet_name]`, applies `find_data_start`, returns `.head(n_rows).to_string(index=True)`
- `run_python(code: str) -> str` — executes code via `exec(code, EXEC_ENV)` with stdout capture, returns stdout capped at 4000 chars; on exception returns `"Error: {ExcType}: {msg}"`

**AC4:** `EXEC_ENV` for `run_python` contains exactly: `{"sheets": loader, "find_data_start": find_data_start, "pd": pd, "np": np}`. No `os`, `open`, `subprocess`, `requests`, or `importlib` keys.

**AC5:** All three tools registered in `api/services/tools/__init__.py` (additive — existing TOOL_SCHEMAS and TOOL_REGISTRY entries unchanged).

**AC6:** `api/services/agent_service.py` `_SYSTEM` content string extended with Excel exploration instructions: three-step workflow (`list_sheets` → `preview_sheet` → `run_python`), warning that headers are NOT at row 0, instruction to always preview before writing extraction code.

**AC7:** Line limits: `excel_loader.py` ≤100 lines, `excel_tools.py` ≤120 lines.

---

## Tasks / Subtasks

- [x] T1: Update `requirements.txt` (AC: 1, 3)
  - [x] T1.1: Add `pandas` with comment `# Story 2.5: Excel agent interactive tools`
  - [x] T1.2: Add `numpy` with comment `# Story 2.5: run_python EXEC_ENV`
  - [x] T1.3: `pip install -r requirements.txt` — confirm clean install

- [x] T2: Create `api/services/excel_loader.py` ≤100 lines (AC: 1, 2)
  - [x] T2.1: Define `EXCEL_PATH` constant — see Dev Notes for exact path resolution
  - [x] T2.2: Implement `LazyExcelLoader` class (no base class, no dataclass):
    - `__init__(self, path: str)` — store path, init `_cache: dict[str, pd.DataFrame] = {}`, open `self._xl = pd.ExcelFile(path, engine="openpyxl")`
    - `sheet_names(self) -> list[str]` — return `self._xl.sheet_names`
    - `dimensions(self) -> dict[str, tuple[int, int]]` — iterate sheet names, `ws = self._xl.book[name]`, return `{name: (ws.max_row, ws.max_column)}`
    - `__getitem__(self, name: str) -> pd.DataFrame` — lazy load + cache: `self._xl.parse(name, header=None)`
  - [x] T2.3: Implement `find_data_start(df: pd.DataFrame) -> pd.DataFrame`:
    - Guarded with `if not row_mask.any(): return df` for all-NaN sheets (e.g. NPV.IRR which has 1 empty cell)
    - `return df.iloc[row_start:, col_start:].reset_index(drop=True)`
  - [x] T2.4: Create module-level singleton wrapped in try/except FileNotFoundError

- [x] T3: Create `api/services/tools/excel_tools.py` ≤120 lines (AC: 3, 4)
  - [x] T3.1: Imports: `builtins`, `io`, `contextlib`, `numpy as np`, `pandas as pd`, and `from api.services.excel_loader import loader, find_data_start`
  - [x] T3.2: Build `EXEC_ENV` with `__builtins__` filtered (removes `__import__` and `open`); data keys: `sheets`, `find_data_start`, `pd`, `np`
  - [x] T3.3: `list_sheets() -> str` — if loader is None return `"Excel file not available"`; else return formatted dims string
  - [x] T3.4: `preview_sheet(sheet_name: str, n_rows: int = 15) -> str` — loader[sheet_name] → find_data_start → .head(n_rows).to_string(index=True)
  - [x] T3.5: `run_python(code: str) -> str` — stdout capture, exec, cap at 4000 chars, exception → `f"Error: {type(e).__name__}: {e}"`
  - [x] T3.6: Define `TOOL_SCHEMAS` — three schemas as specified

- [x] T4: Register excel tools in `api/services/tools/__init__.py` (AC: 5)
  - [x] T4.1: Import `excel_tools` (three functions + `TOOL_SCHEMAS as _EXCEL_SCHEMAS`)
  - [x] T4.2: Append `_EXCEL_SCHEMAS` to the `TOOL_SCHEMAS` list (additive)
  - [x] T4.3: Add `"list_sheets"`, `"preview_sheet"`, `"run_python"` to `TOOL_REGISTRY`

- [x] T5: Extend `api/services/agent_service.py` system prompt (AC: 6)
  - [x] T5.1: Appended Excel exploration workflow to `_SYSTEM["content"]` — list_sheets → preview_sheet → run_python, with header-row warning

- [x] T6: Verify end-to-end (AC: all)
  - [x] T6.1: All services import cleanly (startup verified via Python import test)
  - [x] T6.2: `list_sheets()` returns 125 sheets with dimensions
  - [x] T6.3: Tool chain callable — list_sheets/preview_sheet/run_python all return data
  - [x] T6.4: `run_python("import os")` → `"Error: ImportError: __import__ not found"` — sandbox confirmed
  - [x] T6.5: All 9 existing tools still in TOOL_REGISTRY — no regressions

---

## Dev Notes

### File path resolution for EXCEL_PATH

```python
# api/services/excel_loader.py
from pathlib import Path

EXCEL_PATH = (
    Path(__file__).parent.parent.parent
    / "data_extract/strategy/financial_model"
    / "v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx"
)
# __file__ = api/services/excel_loader.py
# .parent   = api/services/
# .parent   = api/
# .parent   = repo root
```

### `pd.ExcelFile` and `.book` attribute

```python
xl = pd.ExcelFile(path, engine="openpyxl")
# Opens the ZIP archive only — no sheet data read yet.

ws = xl.book["Sheet Name"]          # openpyxl Worksheet (from Workbook)
dims = (ws.max_row, ws.max_column)  # from XML manifest — fast, no cell data

df = xl.parse("Sheet Name", header=None)  # loads + parses one sheet
```

`xl.book` is the openpyxl `Workbook` — available when `engine="openpyxl"`. `max_row` / `max_column` come from openpyxl's sheet dimension XML attribute — no cell iteration needed.

### `find_data_start` behaviour

`idxmax()` on an all-False boolean Series returns 0 — safe fallback for completely-filled sheets. Works correctly on sheets with no leading blanks.

### `run_python` exec environment — critical details

```python
EXEC_ENV = {
    "sheets":           loader,           # sheets['Sheet Name'] → DataFrame
    "find_data_start":  find_data_start,  # offset crop helper
    "pd":               pd,
    "np":               np,
}
# Do NOT add __builtins__: {} — that breaks print(), range(), len(), etc.
# exec() default builtins include print, which stdout capture relies on.
# os, open, subprocess, requests, importlib are simply absent — access raises NameError/ImportError.
```

### TOOL_SCHEMAS for excel_tools.py

```python
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "list_sheets",
            "description": (
                "Returns all sheet names in the financial Excel model with their dimensions (rows × cols). "
                "Call this first for any ad-hoc financial model question — use sheet names and sizes "
                "to identify which 1–3 sheets to preview."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "preview_sheet",
            "description": (
                "Returns the first n_rows rows of a named Excel sheet as a plain-text table. "
                "Always call this before run_python — headers are NOT at row 0, "
                "data layout varies per sheet. Use the output to understand column positions "
                "before writing extraction code."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sheet_name": {
                        "type": "string",
                        "description": "Exact sheet name as returned by list_sheets()",
                    },
                    "n_rows": {
                        "type": "integer",
                        "description": "Rows to return (default 15, max 30)",
                        "default": 15,
                    },
                },
                "required": ["sheet_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_python",
            "description": (
                "Executes pandas Python code against the Excel financial model. "
                "In scope: sheets['Sheet Name'] → DataFrame, find_data_start(df), pd, np. "
                "Use print() for output — stdout is returned (capped at 4000 chars). "
                "Always call preview_sheet first to understand column/row layout."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute. Use print() for all output.",
                    }
                },
                "required": ["code"],
            },
        },
    },
]
```

### Current `__init__.py` pattern to follow

```python
# Existing pattern in api/services/tools/__init__.py:
from api.services.tools.schedule_tools import (
    TOOL_SCHEMAS as _SCHEDULE_SCHEMAS,
    get_schedule_overview,
    get_bu_schedule,
    estimate_delay_impact,
)
TOOL_SCHEMAS = _KPI_SCHEMAS + _fin_schemas + rag_tools.TOOL_SCHEMAS + _SCHEDULE_SCHEMAS
# → append _EXCEL_SCHEMAS to the end of this chain
```

### Colleague boundaries

| File | Rule |
|---|---|
| `api/services/tools/financial_data_tools.py` | Do NOT touch — pre-computed JSON tools remain |
| `api/services/tools/schedule_tools.py` | Do NOT touch |
| `api/services/tools/kpi_tools.py` | Do NOT touch |
| `api/services/tools/rag_tools.py` | Do NOT touch |
| `api/services/data_cache.py` | Do NOT touch |
| `api/services/narrative_service.py` | Do NOT touch — has uncommitted changes |
| `api/services/agent_service.py` | Extend `_SYSTEM` content only — do not change the agent loop |
| Any `app/` or `components/` | ws:B — do not touch |

### Worktree data file note

`data_extract/` is gitignored. In a git worktree the Excel file will be absent — `loader` will be `None` and all three tools return `"Excel file not available"`. To test: run from the main repo where `data_extract/` is populated. This is expected behaviour and requires no special handling.

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- `find_data_start` required an all-NaN guard: `NPV.IRR` sheet is a 1-cell empty sheet; `idxmax()` on an all-False Series raises `ValueError` in pandas 2.x. Added `if not row_mask.any(): return df` as safe fallback.
- `run_python` sandbox: story assumed `import os` raises from absent EXEC_ENV key, but `exec()` uses `__builtins__` for import resolution. Fixed by providing filtered `_SAFE_BUILTINS` (removes `__import__` and `open`) — `print()`, `range()`, `len()` etc. remain available.

### Completion Notes List
- `excel_loader.py` (46 lines) and `excel_tools.py` (111 lines) — both within AC7 line limits.
- 125 sheets loaded (Excel file has 125 sheets, not ~140 as estimated in story — acceptable variance).
- All 3 tools functional: `list_sheets()` returns 125 sheets, `preview_sheet()` trims leading blanks, `run_python()` captures stdout and blocks imports/file I/O.
- All 9 pre-existing tools confirmed in TOOL_REGISTRY — no regressions.
- `get_financial_model("phosphate")` returns 2025–2030 EBITDA and revenue values — AC5 regression confirmed.

### File List
- `api/services/excel_loader.py` — NEW
- `api/services/tools/excel_tools.py` — NEW
- `api/services/tools/__init__.py` — MODIFIED: registered excel tools
- `api/services/agent_service.py` — MODIFIED: extended system prompt
- `requirements.txt` — MODIFIED: added pandas, numpy

### Change Log
- 2026-04-13: Story 2.5 implemented — LazyExcelLoader, 3 Excel tools, system prompt extension (claude-sonnet-4-6)
