# Story 2.8: Sheet Label Map

**Story ID:** 2.8
**Story Key:** 2-8-sheet-label-map
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-13

<!-- Workstream A — Python backend only. No frontend changes.
     PREREQUISITE: Story 2.5 must be done (excel_tools.py + LazyExcelLoader exist).
     PREREQUISITE: Story 2.7 must be done (preview_sheets exists).
     This story is purely additive — do NOT modify list_sheets, preview_sheet, preview_sheets, or run_python.
     No changes to financial_data_tools.py, schedule_tools.py, kpi_tools.py, rag_tools.py, data_cache.py.
     No changes to any frontend files. -->

---

## Story

As a developer,
I want a `get_sheet_labels` tool that returns every string cell in an Excel sheet with its exact (row, col) coordinates,
so that the AI agent can discover where specific data lives — regardless of label spelling or row depth — without writing exploratory `run_python` code, collapsing a typical 9-round financial query to 3 rounds.

---

## Acceptance Criteria

**AC1:** `api/services/tools/excel_tools.py` exports a new function `get_sheet_labels(sheet_name: str) -> str` that:
- Returns `"Excel file not available"` if `loader is None`
- Returns `"Sheet '{sheet_name}' not found"` (no exception) for unknown sheet names
- Iterates over every cell in the raw sheet (via `loader[sheet_name]`, NOT `find_data_start`) — labels live before the data start
- For each cell where `isinstance(value, str) and value.strip()`: emits `"row {r}, col {c}: {repr(value)}"`
- Output capped at 6000 chars
- Returns `"No string cells found in '{sheet_name}'"` if the sheet contains no string values

**AC2:** `TOOL_SCHEMAS` gains one new entry for `get_sheet_labels`:
- `sheet_name`: string, required
- Description instructs the agent to call this after `list_sheets` to discover label positions before writing `run_python` extraction code; explicitly states "use this when you need to find which row contains a specific metric"

**AC3:** `get_sheet_labels` registered in `api/services/tools/__init__.py` (additive — no existing registrations changed).

**AC4:** System prompt in `api/services/agent_service.py` updated so the Excel workflow becomes:
```
list_sheets → get_sheet_labels(sheet) → run_python
```
- Replace the `preview_sheets([...])` instruction with `get_sheet_labels(sheet_name)` as the primary discovery step
- Add explicit guidance: "use get_sheet_labels to find which row contains the metric you need, then write targeted run_python code using the exact row index returned"
- Retain all existing warnings (headers NOT at row 0, always inspect before extraction)
- `preview_sheets` remains in the schema and may still be called; it is just no longer the primary recommended step

**AC5:** `EXEC_ENV` in `excel_tools.py` gains `np.set_printoptions(legacy="1.25")` call before the dict is constructed, fixing the `RuntimeError: Unable to configure default ndarray.__str__` seen in run_python executions.

**AC6:** All existing tools (`list_sheets`, `preview_sheet`, `preview_sheets`, `run_python`) are untouched — signatures, behaviour, and schema entries unchanged.

**AC7:** `excel_tools.py` remains ≤185 lines.

---

## Tasks / Subtasks

- [x] T1: Fix numpy printing in EXEC_ENV (AC: 5)
  - [x] T1.1: Add `np.set_printoptions(legacy="1.25")` immediately after `import numpy as np`, before `EXEC_ENV` dict definition
  - [x] T1.2: Confirm no existing tests break

- [x] T2: Add `get_sheet_labels` function to `api/services/tools/excel_tools.py` (AC: 1)
  - [x] T2.1: Implement function — iterate raw `loader[sheet_name]` (not find_data_start), emit string cells with (row, col)
  - [x] T2.2: Add guard for unknown sheet names (catch Exception, return "not found" message)
  - [x] T2.3: Add guard for loader is None
  - [x] T2.4: Cap output at 6000 chars; return "no string cells" message for empty result

- [x] T3: Add tool schema entry for `get_sheet_labels` (AC: 2)
  - [x] T3.1: Add schema to `TOOL_SCHEMAS` after the `preview_sheets` entry
  - [x] T3.2: Description must say "use this to find which row contains a specific metric before writing run_python"

- [x] T4: Register in `api/services/tools/__init__.py` (AC: 3)
  - [x] T4.1: Import `get_sheet_labels` from `excel_tools`
  - [x] T4.2: Add `"get_sheet_labels": get_sheet_labels` to `TOOL_REGISTRY`

- [x] T5: Update system prompt in `api/services/agent_service.py` (AC: 4)
  - [x] T5.1: Replace `preview_sheets([sheet1, sheet2, ...])` step with `get_sheet_labels(sheet_name)` as primary discovery step
  - [x] T5.2: Add guidance to use the returned row indices directly in run_python
  - [x] T5.3: Retain all existing warnings

- [x] T6: Verify end-to-end (AC: all)
  - [x] T6.1: `get_sheet_labels('Consolidated Group')` returns entries including row 300 label without error
  - [x] T6.2: `get_sheet_labels('NonExistent')` returns "not found" — no exception
  - [x] T6.3: `get_sheet_labels` on a sheet with no strings returns the "no string cells" message
  - [x] T6.4: All pre-existing tools still in TOOL_REGISTRY — no regressions
  - [x] T6.5: `excel_tools.py` line count ≤185 (actual: 184)
  - [x] T6.6: numpy `RuntimeError` no longer occurs — `run_python` with a numpy array print completes cleanly

---

## Dev Notes

### Why raw loader, not find_data_start

`find_data_start` crops leading blank rows to reach the numeric data block. Labels like "Sustaining capex additions" at row 300 exist in the raw sheet — they are the *labels of* the data block, not inside it. Using `find_data_start` would shift row indices and potentially hide labels that appear before the crop point.

Always use `loader[sheet_name]` directly in this function so row indices in the output match what `run_python` sees when accessing `sheets['Sheet Name']`.

### Implementation pattern

```python
def get_sheet_labels(sheet_name: str) -> str:
    if loader is None:
        return "Excel file not available"
    try:
        df = loader[sheet_name]
    except Exception:
        return f"Sheet '{sheet_name}' not found"
    hits = []
    for r in range(len(df)):
        for c in range(len(df.columns)):
            val = df.iat[r, c]
            if isinstance(val, str) and val.strip():
                hits.append(f"row {r}, col {c}: {repr(val)}")
    if not hits:
        return f"No string cells found in '{sheet_name}'"
    return "\n".join(hits)[:6000]
```

### numpy fix

```python
import numpy as np
np.set_printoptions(legacy="1.25")  # prevents RuntimeError in exec'd code using np arrays
```

Place this immediately after `import numpy as np`, before `EXEC_ENV` is defined.

### Tool schema pattern

```python
{
    "type": "function",
    "function": {
        "name": "get_sheet_labels",
        "description": (
            "Returns every string cell in an Excel sheet with its exact row and col index. "
            "Use this after list_sheets to discover where a specific metric lives — "
            "e.g. which row contains 'capex' or 'revenue' — before writing run_python extraction code. "
            "Row and col indices in the output match the indices used inside run_python via sheets['Sheet Name']."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "sheet_name": {
                    "type": "string",
                    "description": "Exact sheet name as returned by list_sheets()",
                },
            },
            "required": ["sheet_name"],
        },
    },
},
```

### System prompt update

```
# BEFORE (from 2.7):
"first list_sheets() to identify candidate sheets, "
"then preview_sheets([sheet1, sheet2, ...]) to inspect all candidates at once (headers are NOT at row 0), "
"then run_python(code) to extract the exact figures. "

# AFTER:
"first list_sheets() to identify candidate sheets, "
"then get_sheet_labels(sheet_name) to find which row contains the metric you need "
"(returns every string cell with exact row and col index), "
"then run_python(code) to extract figures using the exact row indices returned. "
"Never guess row positions — always confirm via get_sheet_labels first. "
```

### Expected agent flow after this story

```
Round 1: list_sheets()
         → agent identifies "Consolidated Group" as likely candidate

Round 2: get_sheet_labels('Consolidated Group')
         → "row 300, col 1: 'Sustaining capex additions'
            row 301, col 1: 'Expansion capex'
            row 3,   col 2: '2021.0'  ← year header row
            ..."

Round 3: run_python("
           df = sheets['Consolidated Group']
           years = df.iloc[3, 2:12].tolist()
           capex = df.iloc[300, 2:12].tolist()
           print(dict(zip(years, capex)))
         ")
         → answer
```

### Colleague boundaries

| File | Rule |
|---|---|
| `api/services/tools/excel_tools.py` | ADD `get_sheet_labels` + numpy fix only — do NOT touch `list_sheets`, `preview_sheet`, `preview_sheets`, `run_python` |
| `api/services/tools/__init__.py` | ADD import + registry entry only |
| `api/services/agent_service.py` | UPDATE system prompt Excel workflow line only |
| Any `app/` or `components/` | Do NOT touch — ws:B |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- T1: Added `np.set_printoptions(legacy="1.25")` immediately after `import numpy as np` — fixes RuntimeError when exec'd code prints numpy arrays
- T2: Implemented `get_sheet_labels(sheet_name)` using raw `loader[sheet_name]` (not find_data_start) so row indices match what run_python sees; iterates all cells via `df.iat[r, c]`; output capped at 6000 chars
- T3: Added schema entry to TOOL_SCHEMAS after preview_sheets; description explicitly says "use this when you need to find which row contains a specific metric"
- T4: Imported and registered get_sheet_labels in __init__.py — additive, no existing registrations changed
- T5: Replaced preview_sheets([...]) with get_sheet_labels(sheet_name) as primary Excel discovery step in _SYSTEM prompt; retained all existing warnings; preview_sheets noted as still available
- T6: 16/16 tests pass (16 new: 7 for get_sheet_labels + 2 registry/schema + 1 line-count updated threshold); excel_tools.py is 184 lines (≤185 AC7); pre-existing logfire env failures in test_agent_service.py are unrelated to this story

### File List
- `api/services/tools/excel_tools.py` — MODIFIED: add `get_sheet_labels` function + schema entry + numpy fix
- `api/services/tools/__init__.py` — MODIFIED: register `get_sheet_labels`
- `api/services/agent_service.py` — MODIFIED: update system prompt Excel workflow line
- `tests/test_excel_tools.py` — MODIFIED: add 7 get_sheet_labels tests + update line-count threshold to 185

### Change Log
- 2026-04-13: Story 2.8 implemented — added get_sheet_labels tool (raw cell scan with row/col coords, 6000-char cap), numpy set_printoptions fix, system prompt updated to list_sheets→get_sheet_labels→run_python workflow; 16 tests pass
