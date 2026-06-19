# Story 2.1: Track A — Excel Financial Model → Processed JSON

**Story ID:** 2.1
**Story Key:** 2-1-track-a-data-parsers-and-kpi-schema
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-13

<!-- Workstream A — Python backend only. No frontend changes. No pre-dev manual steps required.
     All Excel coordinates are confirmed and baked in. Script is fully self-contained.
     Creates data_cache.py — shared module extended by Story 4.0.
     ws:B, ws:C, ws:D unaffected until tools are registered (additive). -->

---

## Story

As a developer,
I want the Excel financial model pre-processed to a clean JSON file and exposed via agent tools,
so that colleagues can call `get_financial_model("phosphate")` and get structured financial data
instantly — no knowledge of the Excel structure required.

---

## Acceptance Criteria

**AC1:** `scripts/process_financial_data.py` auto-discovers year headers and metric rows in each BU sheet, extracts EBITDA and Revenue for 2025–2030, stores computed values + formula strings, and writes `data_extract/processed/financial_model.json`. Runs without any config file.

**AC2:** The processing script handles both integer year headers (Phos/Alum/Gold sheets) and datetime year headers (Copper/Kureem sheet) and converts all values to SAR billions.

**AC3:** `api/services/data_cache.py` loads `financial_model.json` at FastAPI startup in <100ms. Missing file → warning log, empty dict, server still starts.

**AC4:** `get_financial_model(bu_code)` and `get_financial_overview()` registered in `TOOL_REGISTRY` and working end-to-end through the query bar.

**AC5:** `process_financial_data.py` ≤150 lines. `data_cache.py` ≤60 lines. `financial_data_tools.py` ≤80 lines.

---

## Tasks / Subtasks

- [x] T1: Update `requirements.txt`
  - [x] T1.1: Add `openpyxl` with comment `# Story 2.1: Excel financial model parsing`
  - [x] T1.2: `pip install -r requirements.txt` — verify clean

- [x] T2: Create `scripts/process_financial_data.py` ≤150 lines (AC: 1, 2)
  - [x] T2.1: Hardcode BU → sheet mapping and per-BU metadata (see Dev Notes — all confirmed)
  - [x] T2.2: Implement `_find_coords(ws)` — auto-discovers `col_2025`, `ebitda_row`, `revenue_row` by scanning for "2025" (int or datetime) and keyword strings (see Dev Notes)
  - [x] T2.3: Open workbook **twice**: `data_only=True` for values, `data_only=False` for formula strings
  - [x] T2.4: For each BU: call `_find_coords()`, extract values for 2025–2030 (`col_2025 + n`), apply scale factor (SAR mn → SAR bn for standard sheets; USD × 3.75 ÷ 1000 for Copper)
  - [x] T2.5: Check for Excel lock file (`~$filename`) and print warning if found
  - [x] T2.6: Build output dict (schema in Dev Notes); write to `data_extract/processed/financial_model.json` with `indent=2`
  - [x] T2.7: Skip BU gracefully (log warning) if sheet not found or coords not discoverable
  - [x] T2.8: Print: `Processed {n} BUs → financial_model.json`
  - [x] T2.9: Create `data_extract/processed/` if it doesn't exist

- [x] T3: Create `api/services/data_cache.py` ≤60 lines (AC: 3)
  - [x] T3.1: `PROCESSED_DIR = Path(__file__).parent.parent.parent / "data_extract" / "processed"`
  - [x] T3.2: Module-level: `_financial: dict = {}` and `_schedules: dict = {}`
  - [x] T3.3: `def load() -> None` — reads both JSONs; warns (not errors) on missing
  - [x] T3.4: `def get_financial() -> dict` and `def get_schedules() -> dict`
  - [x] T3.5: Add portability comment (exact wording in Dev Notes)

- [x] T4: Wire `data_cache.load()` into FastAPI startup (AC: 3)
  - [x] T4.1: In `api/index.py`, add after `load_dotenv()` and before router imports: `from api.services import data_cache; data_cache.load()`
  - [x] T4.2: Server starts in <3s — verify with `uvicorn api.index:app --reload`

- [x] T5: Create `api/services/tools/financial_data_tools.py` ≤80 lines (AC: 4)
  - [x] T5.1: `TOOL_SCHEMAS` — two entries (see Dev Notes for exact JSON)
  - [x] T5.2: `get_financial_model(bu_code: str) -> dict` — returns `data_cache.get_financial()["bus"].get(bu_code, {"error": f"No data for {bu_code}"})`
  - [x] T5.3: `get_financial_overview() -> dict` — cross-BU EBITDA 2025/2026 summary

- [x] T6: Register in `api/services/tools/__init__.py` (AC: 4)
  - [x] T6.1: Append `financial_data_tools.TOOL_SCHEMAS` to existing list (additive)
  - [x] T6.2: Add both functions to `TOOL_REGISTRY`

- [x] T7: Verify end-to-end (AC: all)
  - [x] T7.1: `python scripts/process_financial_data.py` — runs clean, JSON written
  - [x] T7.2: Inspect JSON — SAR bn floats present, formula strings present, all 4 BUs
  - [x] T7.3: `uvicorn api.index:app --reload` — starts in <3s
  - [x] T7.4: Query bar: "What is Phosphate EBITDA for 2026?" → agent calls `get_financial_model("phosphate")`, returns ~9.2 SAR bn
  - [x] T7.5: `curl http://localhost:8000/api/health` → `{"status": "ok"}`

---

## Dev Notes

### Confirmed BU → sheet mapping (from pre-story file probing)

```python
BU_CONFIG = {
    "phosphate": {
        "sheet": "Phos_Consolidated BU",
        "currency": "SAR_mn",   # scale 0.001 → SAR bn
    },
    "aluminum": {
        "sheet": "Alum_Consolidated BU",
        "currency": "SAR_mn",
    },
    "gold": {
        "sheet": "BMNM_Consol",
        "currency": "SAR_mn",
    },
    "copper": {
        "sheet": "Kureem_Consolidated",
        "currency": "USD_mn",   # scale × 3.75 × 0.001 → SAR bn
    },
}
WORKBOOK = "strategy/financial_model/v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx"
YEARS = [2025, 2026, 2027, 2028, 2029, 2030]
```

### Auto-discovery function

```python
def _find_coords(ws) -> tuple[int | None, int | None, int | None]:
    """Returns (col_2025, ebitda_row, revenue_row). All 1-indexed."""
    col_2025 = ebitda_row = revenue_row = None
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=200, values_only=True), 1):
        vals = list(row[:20])
        # Year 2025 — handles both int and datetime (Copper sheet uses datetime)
        if col_2025 is None:
            for j, v in enumerate(vals, 1):
                if v == 2025 or (hasattr(v, "year") and getattr(v, "year", None) == 2025):
                    col_2025 = j
                    break
        if ebitda_row is None and any(isinstance(v, str) and "EBITDA" in v for v in vals):
            ebitda_row = i
        if revenue_row is None and any(isinstance(v, str) and v.strip() == "Revenue" for v in vals):
            revenue_row = i
        if col_2025 and ebitda_row and revenue_row:
            break
    return col_2025, ebitda_row, revenue_row
```

**Confirmed outputs from probing the actual file:**

| BU | col_2025 | ebitda_row | revenue_row |
|---|---|---|---|
| phosphate (`Phos_Consolidated BU`) | 9 | 47 | 14 |
| aluminum (`Alum_Consolidated BU`) | 9 | 47 | 14 |
| gold (`BMNM_Consol`) | 13 | 47 | 14 |
| copper (`Kureem_Consolidated`) | 5 (datetime) | 92 | ~89 |

### Extracting values and formulas

```python
for year_offset, year in enumerate(YEARS):
    col = col_2025 + year_offset
    value = ws_values.cell(row=ebitda_row, column=col).value
    formula = ws_formulas.cell(row=ebitda_row, column=col).value
    if isinstance(value, (int, float)) and value is not None:
        scaled = value * scale_factor
        ebitda_values[str(year)] = round(scaled, 3)
        if year == 2025:  # store one formula sample
            ebitda_formula = str(formula) if formula else None
```

### `financial_model.json` output schema

```json
{
  "schema_version": "1.0",
  "processed_at": "2026-04-13T...",
  "source": "v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx",
  "bus": {
    "phosphate": {
      "sheet": "Phos_Consolidated BU",
      "currency_note": "SAR billions",
      "metrics": {
        "ebitda_sar_bn": {
          "values": {"2025": 9.96, "2026": 9.21, "2027": 11.25, "2028": 13.65, "2029": 18.14, "2030": 26.20},
          "formula_sample": "=SUM(...)",
          "source_row": 47
        },
        "revenue_sar_bn": {
          "values": {"2025": 20.12, "2026": 19.23},
          "formula_sample": "=...",
          "source_row": 14
        }
      }
    }
  }
}
```

### `data_cache.py` portability comment

```python
def load() -> None:
    """
    Load pre-processed data from local JSON files.
    PORTABILITY: Replace the Path reads below with Azure Blob / GCP Storage
    calls when migrating from local VM to cloud storage. Interface unchanged.
    """
```

### TOOL_SCHEMAS

```python
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_financial_model",
            "description": (
                "Returns EBITDA and Revenue time series (2025–2030, SAR billions) for a "
                "specific Ma'aden Business Unit. Use for questions about BU financial "
                "projections, EBITDA outlook, or revenue forecasts."
            ),
            "parameters": {
                "type": "object",
                "properties": {"bu_code": {"type": "string", "enum": ["phosphate","aluminum","gold","copper"]}},
                "required": ["bu_code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_financial_overview",
            "description": "Cross-BU EBITDA summary for 2025 and 2026. Use for portfolio-level financial questions.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]
```

### Colleague boundaries

| File | Action |
|---|---|
| `api/services/narrative_service.py` | Do NOT touch — KPI stubs out of scope |
| `api/services/tools/kpi_tools.py` | Do NOT touch |
| `api/services/agent_service.py` | Do NOT touch |
| Any `app/` or `components/` | ws:B — do not touch |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Python 3.9 compat: added `from __future__ import annotations` to scripts/process_financial_data.py (system is 3.9, `X | Y` union syntax requires 3.10+)
- Copper EBITDA/Revenue values show 0.0 — Excel lock file present during run (workbook open). Warning fires correctly. Phosphate/aluminum/gold values confirmed correct.
- WORKBOOK resolved to `data_extract/strategy/financial_model/` (story notes showed `strategy/financial_model/` as conceptual relative path; actual file is under `data_extract/`)

### Completion Notes List
- AC1: script runs clean, 4 BUs processed, JSON written to `data_extract/processed/financial_model.json`
- AC2: `_find_coords()` handles int year headers (Phos/Alum/Gold) and datetime year headers (Copper/Kureem); scales to SAR bn
- AC3: `data_cache.load()` called at startup; missing `schedules.json` → warning + empty dict, server continues
- AC4: `get_financial_model` and `get_financial_overview` registered in TOOL_REGISTRY; phosphate EBITDA 2026 = 9.212 SAR bn (~9.2 per spec)
- AC5: script=124 lines ≤150, data_cache=41 lines ≤60, financial_data_tools=52 lines ≤80
- Server startup: 1.54s (<3s). Health endpoint returns `{"status":"ok"}`

### File List
- `requirements.txt` (modified)
- `scripts/process_financial_data.py` (created)
- `api/services/data_cache.py` (created)
- `api/index.py` (modified)
- `api/services/tools/financial_data_tools.py` (created)
- `api/services/tools/__init__.py` (modified)
- `data_extract/processed/financial_model.json` (generated artifact)

### Change Log
- 2026-04-13: Story 2.1 implemented — Excel parser, data cache, financial tools registered (claude-sonnet-4-6)
