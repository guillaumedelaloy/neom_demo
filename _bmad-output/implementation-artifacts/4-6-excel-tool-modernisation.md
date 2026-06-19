# Story 4.6: Excel Tool Modernisation

**Story ID:** 4.6
**Story Key:** 4-6-excel-tool-modernisation
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-14

<!-- Context: Story 2.10 collapsed Excel discovery to describe_workbook → run_python.
     The problem: describe_workbook returns positions but not values, so the agent
     writes pandas code blind against a sheet it has never seen → wrong row indices →
     multiple retry rounds → ~15 tool calls per question.

     The fix is a two-phase flow:
       1. describe_workbook (lightweight — BU aliases + sheet list)  ← already have this
       2. preview_sheet / preview_sheets (see ACTUAL data, then write code)  ← re-expose
       3. run_python (targeted, correct on first attempt)

     preview_sheet and preview_sheets already exist as Python functions in excel_tools.py
     (Story 2.10 AC8 kept them importable). This story re-adds them to TOOL_SCHEMAS.

     Also: run_python output cap raised 4000 → 10,000 chars — truncation is the #1 cause
     of follow-up "get more data" tool calls.

     Dependency: Story 4.5 (full-text index) must be done so describe_workbook
     can surface non-key sheet names with their text_tokens.

     KEY CONSTRAINT: Story 2.10 is currently in "review" — do NOT merge 4.6 before 2.10
     is done. Branch from the story/2.10 branch, not main. -->

---

## Story

As VALUE LENS,
I want to call `preview_sheet` to see the actual structure and values of a sheet before writing
extraction code,
so that my `run_python` calls succeed on the first attempt — eliminating the 3–5 retry rounds
that currently inflate every financial question to 15 tool calls.

---

## Acceptance Criteria

**AC1 — preview_sheet re-exposed in TOOL_SCHEMAS**

`api/services/tools/excel_tools.py`: `preview_sheet` added back to `TOOL_SCHEMAS` with description:

> "Shows the first N rows of an Excel sheet as a formatted table (default 30 rows).
> Call this after describe_workbook to see actual values and structure before writing
> run_python code. Returns sheet_name, row count, and the table."

Schema: `{sheet_name: string, n_rows: integer (optional, default 30)}`.

**AC2 — preview_sheets re-exposed in TOOL_SCHEMAS**

`api/services/tools/excel_tools.py`: `preview_sheets` added back to `TOOL_SCHEMAS` with description:

> "Preview multiple sheets in one call. Pass a list of sheet names. Use when a question
> spans multiple sheets — avoids one round-trip per sheet."

Schema: `{sheet_names: array of strings, n_rows: integer (optional, default 20)}`.

**AC3 — list_sheets re-exposed in TOOL_SCHEMAS**

`api/services/tools/excel_tools.py`: `list_sheets` added back to `TOOL_SCHEMAS` with description:

> "Lists all sheet names with row/column dimensions. Use when the data catalogue doesn't
> name the sheet you need, or to confirm a sheet exists before previewing."

Schema: no parameters.

**AC4 — describe_workbook becomes lightweight overview**

`describe_workbook()` output is restructured to be a fast orientation tool, not a deep
row-label dump:
- Keep: WORKBOOK header, BU alias map, key sheet names + dims + year range
- Remove: the per-sheet row_labels block (too verbose, agents use preview_sheet instead)
- Add: for non-key sheets (from full-text index AC5 in Story 4.5), emit top 5 text tokens
- New output cap: **8,000 chars** (from 15,000 — it's now lightweight enough)

The revised description in TOOL_SCHEMAS:
> "Returns a compact overview of the financial workbook: BU alias map, all sheet names with
> dimensions and year ranges, and top labels for each sheet. Use this to identify which sheet
> to preview — then call preview_sheet to see actual values."

**AC5 — run_python output cap raised to 10,000 chars**

In `run_python()`: `return buf.getvalue()[:4000]` → `return buf.getvalue()[:10000]`.

**AC6 — TOOL_REGISTRY updated**

In `api/services/tools/__init__.py`: `list_sheets`, `preview_sheet`, `preview_sheets` added
back to TOOL_REGISTRY and TOOL_SCHEMAS aggregation. Total active Excel tools: 5
(`describe_workbook`, `list_sheets`, `preview_sheet`, `preview_sheets`, `run_python`).

**AC7 — _PROGRESS updated in agent_service.py**

Add thinking messages for re-exposed tools:
```python
"list_sheets":     "Checking available Excel sheets…",
"preview_sheet":   "Previewing sheet structure…",
"preview_sheets":  "Loading sheet previews…",
```

**AC8 — VALUE LENS system prompt updated in agents.yaml**

The VALUE LENS agent system prompt (in `api/agents.yaml`) is updated to reflect the new
two-step Excel flow:

```
For financial questions: use the data catalogue (already in your context) to identify
the correct sheet. Then call preview_sheet to see actual values and structure.
Then call run_python once with precise targeting based on what you saw.
When a question spans multiple sheets, call preview_sheets([list]) in one round.
Never guess row or column positions — preview first.
```

Remove any reference to "describe_workbook returns row positions".

---

## Tasks / Subtasks

- [x] T1: Update `api/services/tools/excel_tools.py` (AC1, AC2, AC3, AC4, AC5)
  - [x] T1.1: Add `list_sheets`, `preview_sheet`, `preview_sheets` back to `TOOL_SCHEMAS`
        with updated descriptions (see AC1–AC3)
  - [x] T1.2: Rewrite `describe_workbook()` to use lightweight format (AC4):
        - BU aliases block (unchanged)
        - Key sheets: name + dims + year range (no row_labels)
        - Non-key sheets: name + dims + top 5 text_tokens (from `loader.index[name]["text_tokens"][:5]`)
        - Cap: 8,000 chars
  - [x] T1.3: Update `describe_workbook` TOOL_SCHEMA description (AC4)
  - [x] T1.4: Raise `run_python` cap: `[:4000]` → `[:10000]` (AC5)

- [x] T2: Update `api/services/tools/__init__.py` (AC6)
  - [x] T2.1: Add `list_sheets`, `preview_sheet`, `preview_sheets` to TOOL_REGISTRY
  - [x] T2.2: Add their schemas to the TOOL_SCHEMAS aggregation list

- [x] T3: Update `api/services/agent_service.py` (AC7)
  - [x] T3.1: Add 3 entries to `_PROGRESS` dict

- [x] T4: Update `api/agents.yaml` (AC8)
  - [x] T4.1: Find VALUE LENS system prompt entry
  - [x] T4.2: Replace the describe_workbook instruction block with the new preview_sheet flow
        (see AC8 text above)

- [x] T5: Verify
  - [x] T5.1: Assert `TOOL_REGISTRY` contains all 5 Excel tools
  - [x] T5.2: Assert `TOOL_SCHEMAS` function names match `TOOL_REGISTRY` keys exactly
  - [x] T5.3: Call `describe_workbook()` — confirm output < 8,000 chars, lists all key sheets
        with year range, non-key sheets show ≤5 tokens
  - [x] T5.4: Call `preview_sheet("Phos_Consolidated BU", n_rows=5)` — returns real data
  - [x] T5.5: Call `preview_sheets(["Phos_Consolidated BU", "Funding Gap"], n_rows=5)` — returns
        both sheets in one call

---

## Dev Notes

### Why re-expose tools removed in 2.10

Story 2.10 removed these tools to reduce "sheet discovery" calls. The root cause of many calls
was actually the blind code generation (not the discovery step itself). With preview_sheet giving
the agent real data to look at, it writes correct run_python code on the first try — fewer total
calls even with the extra preview step.

Typical new flow: describe_workbook (orient) → preview_sheet (see data) → run_python (extract).
3 calls. Previous flow: describe_workbook → run_python (wrong) → run_python (retry) → ... = 8+.

### preview_sheet is a live Excel read

`preview_sheet` reads from the live Excel file via `LazyExcelLoader`. There is no pre-computed
cache. This is acceptable — the workbook is loaded in memory at startup; sheet access is fast.
Do NOT cache previews in workbook_index.json (too large — see Story 4.5 size analysis).

### describe_workbook non-key sheet tokens

After Story 4.5, `loader.index[sheet_name]["text_tokens"]` exists for all 125 sheets.
Use `[:5]` for the lightweight describe output. If the index wasn't rebuilt (text_tokens absent),
fall back to omitting the token line gracefully.

### DO NOT touch

| File | Reason |
|---|---|
| `scripts/build_workbook_index.py` | Modified in Story 4.5 only |
| `api/services/excel_loader.py` | No changes needed |
| `api/services/tools/schedule_tools.py` | Unrelated |
| Any frontend file | ws:B only |

### agents.yaml location

`api/agents.yaml` — confirmed in repo root of api/. Contains all five agent system prompts
plus router prompt. Only the VALUE LENS entry needs updating. Do NOT touch other agents.

---

## Previous Story Intelligence (Stories 2.10, 4.3, 4.5)

- Story 2.10 kept `list_sheets`, `preview_sheet`, `preview_sheets`, `get_sheet_labels` as importable
  functions — they are NOT deleted, just removed from TOOL_SCHEMAS. Re-adding to TOOL_SCHEMAS is safe.
- Story 4.3 confirmed catalogue already injected into every agent system_prompt via `query.py` —
  VALUE LENS already has the sheet navigation guide from the catalogue
- Story 4.5 adds `text_tokens` to all 125 sheets — this story depends on that field existing for
  the non-key sheet token display in describe_workbook
- `find_data_start(df)` helper exists in `excel_loader.py` — `preview_sheet` already uses it;
  no change needed to that helper
