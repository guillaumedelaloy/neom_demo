# Story 2.7: Batch Sheet Preview

**Story ID:** 2.7
**Story Key:** 2-7-batch-sheet-preview
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-13

<!-- Workstream A — Python backend only. No frontend changes.
     PREREQUISITE: Story 2.5 must be done (excel_tools.py + LazyExcelLoader exist).
     This story is purely additive — do NOT modify preview_sheet, list_sheets, or run_python.
     The colleague on Epic 5 depends on the existing tool signatures — do not break them.
     No changes to financial_data_tools.py, schedule_tools.py, kpi_tools.py, rag_tools.py, data_cache.py.
     No changes to any frontend files. -->

---

## Story

As a developer,
I want a `preview_sheets` tool that previews multiple Excel sheets in a single tool call,
so that the AI agent can inspect several candidate sheets at once instead of calling `preview_sheet` once per sheet, reducing round-trips and latency for financial queries.

---

## Acceptance Criteria

**AC1:** `api/services/tools/excel_tools.py` exports a new function `preview_sheets(sheet_names: list[str], n_rows: int = 15) -> str` that:
- Accepts a list of 1–5 sheet names and an optional `n_rows` parameter (default 15)
- For each valid sheet name: loads via `loader[sheet_name]`, applies `find_data_start`, returns `.head(n_rows).to_string(index=True)`
- Separates each sheet's output with a clear header: `\n=== {sheet_name} ===\n`
- For any sheet name not found in the workbook: includes `"Sheet '{name}' not found"` in that slot instead of raising
- Returns `"Excel file not available"` if `loader is None`
- Total output capped at 6000 chars (same safety pattern as `run_python`)

**AC2:** `TOOL_SCHEMAS` in `excel_tools.py` gains one new entry for `preview_sheets`:
- `sheet_names`: array of strings, description clarifies it accepts 1–5 names, required
- `n_rows`: integer, default 15, max 30, optional
- Description instructs the agent to use this instead of multiple `preview_sheet` calls

**AC3:** `preview_sheets` registered in `api/services/tools/__init__.py` alongside existing excel tools (additive — no existing registrations changed).

**AC4:** System prompt in `api/services/agent_service.py` updated to prefer `preview_sheets` over multiple `preview_sheet` calls:
- Existing Excel workflow instruction updated to: `list_sheets → preview_sheets([sheet1, sheet2, ...]) → run_python`
- Wording must retain the "headers are NOT at row 0" and "always preview before writing extraction code" warnings

**AC5:** Existing `preview_sheet` (singular) is **untouched** — signature, behaviour, and schema entry unchanged. Epic 5 colleague depends on it.

**AC6:** `excel_tools.py` remains ≤150 lines (was ≤120 in 2.5; this story adds ~20 lines).

---

## Tasks / Subtasks

- [x] T1: Add `preview_sheets` function to `api/services/tools/excel_tools.py` (AC: 1)
  - [x] T1.1: Implement function — iterate `sheet_names`, load+preview each, join with `=== {name} ===` headers
  - [x] T1.2: Add guard for unknown sheet names (catch `KeyError` from `loader[name]`, emit "not found" message)
  - [x] T1.3: Cap total output at 6000 chars before returning
  - [x] T1.4: Confirm `loader is None` guard matches pattern of existing tools

- [x] T2: Add tool schema entry for `preview_sheets` (AC: 2)
  - [x] T2.1: Add schema to `TOOL_SCHEMAS` list — after the `preview_sheet` entry
  - [x] T2.2: `sheet_names` parameter: `type: array`, `items: {type: string}`, required
  - [x] T2.3: Description must explicitly say "use this instead of calling preview_sheet multiple times"

- [x] T3: Register in `api/services/tools/__init__.py` (AC: 3)
  - [x] T3.1: Import `preview_sheets` from `excel_tools`
  - [x] T3.2: Add `"preview_sheets": preview_sheets` to `TOOL_REGISTRY`
  - [x] T3.3: Confirm `TOOL_SCHEMAS` picks up new entry automatically via the existing `_EXCEL_SCHEMAS` append chain

- [x] T4: Update system prompt in `api/services/agent_service.py` (AC: 4)
  - [x] T4.1: Replace `preview_sheet(sheet_name)` reference in the Excel workflow instruction with `preview_sheets([sheet1, sheet2, ...])`
  - [x] T4.2: Keep all existing warnings intact (headers not at row 0, always preview before run_python)

- [x] T5: Verify end-to-end (AC: all)
  - [x] T5.1: `preview_sheets(["Phos_Consolidated BU", "Alum_Consolidated BU"])` returns both previews separated by headers
  - [x] T5.2: `preview_sheets(["NonExistent"])` returns "Sheet 'NonExistent' not found" — no exception
  - [x] T5.3: Existing `preview_sheet` still works — call it directly and confirm unchanged output
  - [x] T5.4: All pre-existing tools still in TOOL_REGISTRY — no regressions
  - [x] T5.5: `excel_tools.py` line count ≤150

---

## Dev Notes

### Exact pattern to follow from preview_sheet

```python
# EXISTING — do not modify
def preview_sheet(sheet_name: str, n_rows: int = 15) -> str:
    if loader is None:
        return "Excel file not available"
    df = find_data_start(loader[sheet_name])
    return df.head(n_rows).to_string(index=True)

# NEW — add below
def preview_sheets(sheet_names: list[str], n_rows: int = 15) -> str:
    if loader is None:
        return "Excel file not available"
    parts = []
    for name in sheet_names:
        try:
            df = find_data_start(loader[name])
            parts.append(f"=== {name} ===\n{df.head(n_rows).to_string(index=True)}")
        except Exception:
            parts.append(f"=== {name} ===\nSheet '{name}' not found")
    result = "\n\n".join(parts)
    return result[:6000]
```

### Tool schema pattern to follow

```python
{
    "type": "function",
    "function": {
        "name": "preview_sheets",
        "description": (
            "Returns the first n_rows rows of multiple Excel sheets in one call. "
            "Use this instead of calling preview_sheet multiple times — pass all "
            "candidate sheet names at once. Headers are NOT at row 0; use the output "
            "to understand column positions before writing run_python extraction code."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "sheet_names": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of exact sheet names as returned by list_sheets(). Max 5.",
                },
                "n_rows": {
                    "type": "integer",
                    "description": "Rows to return per sheet (default 15, max 30)",
                    "default": 15,
                },
            },
            "required": ["sheet_names"],
        },
    },
},
```

### __init__.py registration pattern (from 2.5)

```python
# Current pattern in api/services/tools/__init__.py:
from api.services.tools.excel_tools import (
    list_sheets,
    preview_sheet,
    run_python,
    TOOL_SCHEMAS as _EXCEL_SCHEMAS,
)
TOOL_REGISTRY = {
    ...
    "list_sheets": list_sheets,
    "preview_sheet": preview_sheet,
    "run_python": run_python,
}
# → add preview_sheets to both the import and TOOL_REGISTRY
```

### System prompt update (agent_service.py)

Find the Excel workflow line in `_SYSTEM["content"]` and update the step sequence:

```
# BEFORE (from 2.5):
"first list_sheets() to identify candidate sheets, "
"then preview_sheet(sheet_name) to inspect structure (headers are NOT at row 0), "

# AFTER:
"first list_sheets() to identify candidate sheets, "
"then preview_sheets([sheet1, sheet2, ...]) to inspect all candidates at once (headers are NOT at row 0), "
```

### Colleague boundaries

| File | Rule |
|---|---|
| `api/services/tools/excel_tools.py` | ADD `preview_sheets` only — do NOT touch `preview_sheet`, `list_sheets`, `run_python` |
| `api/services/tools/__init__.py` | ADD import + registry entry only |
| `api/services/agent_service.py` | UPDATE system prompt Excel line only — do not touch agent loop |
| `api/services/tools/financial_data_tools.py` | Do NOT touch |
| `api/services/excel_loader.py` | Do NOT touch |
| Any `app/` or `components/` | Do NOT touch — ws:B |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- Added `preview_sheets(sheet_names: list[str], n_rows: int = 15) -> str` to `excel_tools.py` following the exact pattern from `preview_sheet`; catches any exception per sheet and returns "not found" message instead of raising; output capped at 6000 chars.
- Schema entry added after `preview_sheet` in `TOOL_SCHEMAS`; description explicitly instructs agent to use this instead of multiple `preview_sheet` calls.
- Registered in `TOOL_REGISTRY` and imported in `__init__.py`; `TOOL_SCHEMAS` picks up new entry automatically via the existing `_EXCEL_SCHEMAS` chain.
- System prompt updated: `preview_sheet(sheet_name)` → `preview_sheets([sheet1, sheet2, ...])` with all existing warnings retained.
- `preview_sheet` (singular) untouched — signature, behaviour, and schema entry unchanged.
- `excel_tools.py` is 148 lines (≤150 AC6 satisfied).
- 9 unit tests added in `tests/test_excel_tools.py`; all pass. Pre-existing test collection errors (7 files, `logfire` not in system Python) are baseline failures unrelated to this story.

### File List
- `api/services/tools/excel_tools.py` — MODIFIED: add `preview_sheets` function + schema entry
- `api/services/tools/__init__.py` — MODIFIED: register `preview_sheets`
- `api/services/agent_service.py` — MODIFIED: update system prompt Excel workflow line
- `tests/test_excel_tools.py` — ADDED: 9 unit tests for `preview_sheets` and regression coverage

### Change Log
- 2026-04-13: Story 2.7 implemented — added `preview_sheets` batch tool to reduce multi-sheet round-trips from N calls to 1
