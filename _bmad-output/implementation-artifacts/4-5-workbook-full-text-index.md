# Story 4.5: Workbook Full-Text Index

**Story ID:** 4.5
**Story Key:** 4-5-workbook-full-text-index
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-14

<!-- Context: Story 2.10 built build_workbook_index.py which indexes only ~10 "consolidated" sheets,
     scanning col A first 200 rows for row labels. This has two problems:
     1. Only 10 of 125 sheets are indexed — agent cannot navigate to per-project sheets
        (e.g. "Phos 4 P1", "ARJ", "Funding Gap") without calling list_sheets + exploration
     2. Text extraction is limited to col A → misses section headers in col B/C, titles
        mid-sheet, footnotes — the sheet descriptor is incomplete for embedding/search

     This story enhances build_workbook_index.py to:
     - Index ALL 125 sheets (not just the whitelist)
     - For every sheet: scan ALL cells and collect every unique non-empty string value
     - Store as "text_tokens" list per sheet → enables sheet-level vector search in Story 4.6

     Dependency: Story 2.10 must be merged first (provides the base build_workbook_index.py).
     The 500 KB JSON size cap is raised to 2 MB to accommodate full-text tokens. -->

---

## Story

As the agent serving Ma'aden's executive dashboard,
I want `build_workbook_index.py` to extract all unique text from every sheet in the workbook,
so that I can find the right sheet by querying any label or section title — not just col A of
the 10 consolidated sheets.

---

## Acceptance Criteria

**AC1 — All sheets indexed (no more stub tier)**

`build_workbook_index.py` removes the `_classify_sheet` / tier distinction.
Every sheet in the workbook receives a full entry in `workbook_index.json` with:
- `dims: [rows, cols]`
- `year_cols: {...}` (existing detection logic, unchanged)
- `text_tokens: [...]` (new — see AC2)

The `"tier"` field and `_WHITELIST` constant are removed.

**AC2 — Full-text token extraction per sheet**

For each sheet, scan every cell across the entire sheet (not just col A, not capped at 200 rows):

```python
tokens = set()
for row in ws.iter_rows(values_only=True):
    for cell in row:
        if isinstance(cell, str) and cell.strip():
            cleaned = cell.strip()
            if 2 <= len(cleaned) <= 120:   # skip single chars and very long formulas
                tokens.add(cleaned)
```

Store as `"text_tokens": sorted(list(tokens))` in the sheet's index entry.
Cap at **300 tokens per sheet** (discard by length — keep shorter, more label-like strings first).

**AC3 — Row labels retained for consolidated sheets**

For the 10 sheets matching the original `_WHITELIST` (kept as a constant `_KEY_SHEETS` for
reference), the existing `row_labels` field is still extracted and stored alongside `text_tokens`.
For non-key sheets, `row_labels` is omitted to save space.

**AC4 — Size limit raised to 2 MB**

The `build_index` function's size guard is updated: abort if output exceeds 2048 KB (was 500 KB).
Print warning at 1.5 MB. The final summary line prints the actual size.

**AC5 — describe_workbook output uses text_tokens for non-key sheets**

`describe_workbook()` in `excel_tools.py` is updated:
- Key sheets (original whitelist): output unchanged — BU aliases + row labels + year cols
- All other sheets: output includes `sheet_name: dims + top 10 text_tokens (comma-separated)`
  instead of being omitted entirely.
- Total output still capped at 15,000 chars (raised from 6,000 — see Story 4.6).

**AC6 — Script runs successfully on the full workbook**

`.venv/bin/python scripts/build_workbook_index.py` completes without error on the 125-sheet
workbook. Run time < 5 minutes (openpyxl read-only mode; acceptable for a one-time build step).
Exit 0 on success.

---

## Tasks / Subtasks

- [x] T1: Update `scripts/build_workbook_index.py` (AC1, AC2, AC3, AC4)
  - [x] T1.1: Remove `_classify_sheet()` function and `tier` logic from `build_index()`
  - [x] T1.2: Rename `_WHITELIST` → `_KEY_SHEETS` (frozenset, same values) for the row_labels path
  - [x] T1.3: Add `_extract_text_tokens(ws)` function: scan all cells, collect unique strings
        matching `2 ≤ len ≤ 120`, cap at 300 (sort by length ascending to prefer short labels)
  - [x] T1.4: In `build_index()` loop: call `_extract_text_tokens(ws)` for every sheet;
        call `_extract_row_labels(ws)` only when `name in _KEY_SHEETS`
  - [x] T1.5: Update output schema: add `"text_tokens"` key; remove `"tier"` key
  - [x] T1.6: Raise size guard from 500 KB to 2048 KB; add 1500 KB warning line
  - [x] T1.7: Update meta: `"total_sheets"`, remove `"indexed_count"` / `"stub_count"`;
        add `"key_sheets_count": len(_KEY_SHEETS)`

- [x] T2: Update `describe_workbook()` in `excel_tools.py` (AC5)
  - [x] T2.1: For non-key sheets, emit: `  {name}: {r}r × {c}c — {top_10_tokens}`
  - [x] T2.2: Raise output cap check to 15,000 chars

- [x] T3: Verify
  - [x] T3.1: Run `build_workbook_index.py` — confirm all 125 sheets in output JSON
  - [x] T3.2: Spot-check `jq '.sheets["Phos 4 P1"].text_tokens[:5]'` — returns real labels
  - [x] T3.3: Spot-check `jq '.sheets["Funding Gap"].text_tokens[:5]'` — returns non-empty list
  - [x] T3.4: Confirm JSON size < 2 MB
  - [x] T3.5: Confirm `describe_workbook()` now surfaces non-key sheet names + tokens (not blank)

---

## Dev Notes

### Why cap at 300 tokens

A sheet like `Alum_Inputs` has 4851 rows — uncapped, it could have thousands of unique strings.
Sort tokens by ascending length first: short strings like "EBITDA", "Revenue", "Capex" rank before
long formula descriptions. The 300-token cap keeps the index compact while retaining the highest
signal labels.

### openpyxl read-only + iter_rows performance

Use `ws.iter_rows(values_only=True)` — avoids cell-by-cell random access which is slow in
read-only mode. Expect ~3–10 seconds per large sheet (MIC, Control). Total for 125 sheets: 2–5 min.

### Merged cells in read-only mode

In `read_only=True`, merged cell values are `None` for non-primary cells — the primary cell holds
the value. `iter_rows(values_only=True)` returns `None` for merged slaves; the `isinstance(cell, str)`
check naturally skips them.

### Size estimate

125 sheets × avg 150 tokens × avg 15 chars/token ≈ 281,250 chars ≈ 275 KB for text_tokens.
Plus existing key-sheet row_labels (~100 KB from Story 2.10). Total: ~375 KB → well under 2 MB.

### DO NOT touch

| File | Reason |
|---|---|
| `api/services/excel_loader.py` | Loads index as-is — no changes needed |
| `api/services/tools/excel_tools.py` | Only `describe_workbook()` output format changed (AC5 only) |
| `api/services/tools/__init__.py` | No registry changes here |
| `api/services/agent_service.py` | Touched in Story 4.7 |
| Any test files for the index | Update assertions for removed `tier` field |

---

## Previous Story Intelligence (Story 2.10)

- `build_workbook_index.py` uses `openpyxl.load_workbook(..., read_only=True, data_only=True)` — keep this
- `_extract_row_labels` is already implemented and capped at 60 — retain as-is for key sheets
- `_detect_year_headers` scans rows 1–6 — retain unchanged for all sheets
- The `_longest_consecutive_run` helper is used by year detection — keep unchanged
- Exit code pattern: `sys.exit(build_index(EXCEL_PATH, INDEX_PATH))` — keep unchanged
- Story 2.10 AC8 removed list_sheets/preview_sheet from TOOL_SCHEMAS but kept functions — Story 4.6 re-exposes them
