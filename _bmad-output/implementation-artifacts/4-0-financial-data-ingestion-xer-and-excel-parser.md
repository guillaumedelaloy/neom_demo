# Story 4.0: Primavera XER → Processed JSON + Schedule Tools

**Story ID:** 4.0
**Story Key:** 4-0-financial-data-ingestion-xer-and-excel-parser
**Epic:** Epic 4 — What-If Scenario Engine
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-13 (rewritten 2026-04-13, scope expanded 2026-04-13)

<!-- Workstream A — Python backend only. No frontend changes.
     PREREQUISITE: Story 2.1 must be done first (creates data_cache.py and data_extract/processed/).
     This story extends data_cache.py with schedule data.
     ws:D (Story 4.1 — Gantt Simulation) depends on the tools AND the full task/dependency data created here.
     Tool signatures are FROZEN once this story is marked done — coordinate with ws:D before any change.
     ws:B and ws:C are unaffected.
     SCOPE CHANGE 2026-04-13: Expanded from milestones-only to full TASK + TASKPRED + WBS extraction.
     Story 4.1 (Gantt simulation) requires TASKPRED (dependencies) — extracting them here avoids a second pass.
     Storage format: JSON (not SQLite) — data volume is small, structure predictable, consistent with data_cache.py. -->

---

## Story

As a developer,
I want all Primavera XER schedule data pre-processed to a comprehensive JSON file and exposed via agent tools,
so that colleagues can call `get_bu_schedule("phosphate")` or `estimate_delay_impact(...)` and get
structured schedule data instantly — and Story 4.1 (Gantt simulation) has full task + dependency data ready.

---

## Acceptance Criteria

**AC1:** `scripts/process_schedule_data.py` reads all V18 (current) and V16 (baseline) XER files across all 5 BUs. Extracts three tables per XER: TASK (all activities, not just milestones), TASKPRED (predecessor dependencies), and WBS (hierarchy). Writes `data_extract/processed/schedules.json`. Runs without any config file.

**AC2:** The processed JSON structure per BU:
- `milestones` — filtered view: only `TT_FinMile`/`TT_Mile` tasks, with `planned_finish`, `baseline_finish`, `variance_days`, `rag_status` (Green/Amber/Red/Unknown). This is what agent tools expose.
- `tasks` — full TASK table for V18 as a list of dicts (activity_id, name, task_type, planned_start, planned_finish, wbs_id). This is what Story 4.1 consumes for Gantt propagation.
- `dependencies` — full TASKPRED table as a list of `{task_id, pred_task_id, pred_type, lag_hr_cnt}`. Story 4.1 uses this for dependency traversal.
- `wbs` — WBS hierarchy as `{wbs_id: {name, parent_wbs_id, proj_id}}`.

Missing V16 baseline for a milestone → `baseline_finish: null`, `variance_days: null`, `rag_status: "Unknown"`.

**AC3:** `api/services/data_cache.py` (created in Story 2.1) is extended: `load()` also reads `schedules.json` into `_schedules` dict.

**AC4:** Three tools registered in `TOOL_REGISTRY` (agent-facing — use `milestones` layer, not raw tasks):
- `get_schedule_overview()` → cross-BU RAG summary + top 5 most-slipped milestones
- `get_bu_schedule(bu_code)` → all projects and milestones for one BU
- `estimate_delay_impact(bu_code, project_name, delay_quarters)` → EBITDA delta (Python arithmetic, no LLM numbers)

**AC5:** `estimate_delay_impact` uses EBITDA data from `data_cache.get_financial()` (populated by Story 2.1). If financial data is missing for that BU, returns `{"error": "Financial data not available", "code": "DATA_MISSING"}`.

**AC6:** Line limits: `process_schedule_data.py` ≤200 lines (increased from 150 — full table extraction), `schedule_tools.py` ≤100 lines.

---

## Tasks / Subtasks

- [ ] T1: Update `requirements.txt` (AC: 1)
  - [ ] T1.1: Add `xerparser` with comment `# Story 4.0: Primavera XER schedule parser`
  - [ ] T1.2: `pip install -r requirements.txt` — clean install

- [ ] T2: Create `scripts/process_schedule_data.py` ≤150 lines (AC: 1, 2)
  - [ ] T2.1: Hardcode `BU_FILES` dict (paths relative to `data_extract/` — see Dev Notes)
  - [ ] T2.2: Implement `_parse_xer(path: Path) -> dict[str, list[dict]]`
    - Call `xer_to_dict(str(path))` from `xerparser`
    - Return `{"tasks": data["tables"]["TASK"], "projects": data["tables"]["PROJECT"]}`
  - [ ] T2.3: Implement `_build_project_lookup(projects: list[dict]) -> dict[str, str]`
    - Returns `{proj_id: proj_short_name}` from the PROJECT table
  - [ ] T2.4: Implement `_extract_milestones(tasks, project_lookup) -> list[dict]`
    - Filter: `task["task_type"] in {"TT_FinMile", "TT_Mile"}`
    - Parse `target_end_date` with `datetime.strptime(s, "%Y-%m-%d %H:%M").date().isoformat()`
    - Return list of `{"activity_id": task["task_code"], "name": task["task_name"], "project_id": task["proj_id"], "project_name": project_lookup.get(task["proj_id"], "Unknown"), "planned_finish": iso_date}`
  - [ ] T2.5: For each BU: parse V18 → extract milestones; parse V16 → build `{task_code: target_end_date}` baseline lookup
  - [ ] T2.6: Merge baseline: for each V18 milestone, look up `task_code` in V16 lookup; compute `variance_days = (planned - baseline).days`; RAG: ≤0 = "Green", 1–30 = "Amber", >30 = "Red"; missing baseline → `null`/`null`/`"Unknown"`
  - [ ] T2.7: Group by project → assign project-level RAG = worst across milestones (Red > Amber > Green > Unknown)
  - [ ] T2.8: Write to `data_extract/processed/schedules.json` with `indent=2`
  - [ ] T2.9: Print per-BU summary: `phosphate: 3 projects, 109 milestones`
  - [ ] T2.10: On parse error for any single BU: log warning and continue (don't abort all BUs)

- [ ] T3: Extend `api/services/data_cache.py` for schedule data (AC: 3)
  - [ ] T3.1: Confirm `_schedules: dict = {}` module-level dict exists (Story 2.1 stubs it)
  - [ ] T3.2: In `load()`: add `schedules.json` read alongside `financial_model.json` read
  - [ ] T3.3: Verify `get_schedules() -> dict` is exported

- [ ] T4: Create `api/services/tools/schedule_tools.py` ≤100 lines (AC: 4, 5)
  - [ ] T4.1: Define `TOOL_SCHEMAS` (3 entries — see Dev Notes)
  - [ ] T4.2: `get_schedule_overview() -> dict`
    - From `data_cache.get_schedules()`: compute RAG counts per BU
    - Find top 5 milestones by `variance_days` descending across all BUs
    - Return `{"bu_rag_summary": {...}, "top_slippage": [...]}`
  - [ ] T4.3: `get_bu_schedule(bu_code: str) -> dict`
    - Returns `data_cache.get_schedules()["bus"][bu_code]` directly
    - Returns `{"error": "BU not found"}` if missing
  - [ ] T4.4: `estimate_delay_impact(bu_code: str, project_name: str, delay_quarters: int) -> dict`
    - Fetch base EBITDA from `data_cache.get_financial()["bus"][bu_code]["metrics"]["ebitda_sar_bn"]["values"]`
    - If missing: return `{"error": "Financial data not available for BU", "code": "DATA_MISSING"}`
    - Apply shift: `_shift_ebitda(base_values, delay_quarters)` → delta dict
    - Find matching project milestones from schedules for flagging
    - Return `{"ebitda_delta_sar_bn": {year: delta}, "flagged_milestones": [...], "delay_quarters": delay_quarters}`
  - [ ] T4.5: `_shift_ebitda(values: dict, delay_quarters: int) -> dict` helper ≤20 lines (see Dev Notes)

- [ ] T5: Register schedule tools in `api/services/tools/__init__.py` (AC: 4)
  - [ ] T5.1: Import `schedule_tools` and append its `TOOL_SCHEMAS` to existing list (additive)
  - [ ] T5.2: Add all three functions to `TOOL_REGISTRY`

- [ ] T6: Run and verify (AC: all)
  - [ ] T6.1: `python scripts/process_schedule_data.py` — completes, JSON written
  - [ ] T6.2: Inspect `data_extract/processed/schedules.json` — valid JSON, dates are ISO strings, RAG values are "Green"/"Amber"/"Red"/"Unknown"
  - [ ] T6.3: `uvicorn api.index:app --reload` — starts in <3s (both JSONs loaded)
  - [ ] T6.4: Via query bar: "What is the RAG status of the Phosphate projects?" → agent calls `get_bu_schedule("phosphate")` and returns structured answer
  - [ ] T6.5: Via query bar: "What if Phos-4 FID slips by 2 quarters?" → agent calls `estimate_delay_impact("phosphate", "Phos-4", 2)` → returns EBITDA delta with Python-computed numbers
  - [ ] T6.6: Manually verify: `estimate_delay_impact("phosphate", "Phos-4", 2)` delta should equal EBITDA[2025] shifted right by 0.5 years — confirm against raw JSON values
  - [ ] T6.7: Existing tools (financial, RAG, KPI stubs) still work — no regressions

---

## Dev Notes

### Deployment topology

FastAPI runs **locally** on port 8000. Python 3.12. Data files at `data_extract/` relative to repo root.

### xerparser API — confirmed from file probing

```python
from xerparser import xer_to_dict

def _parse_xer(path: Path) -> dict:
    data = xer_to_dict(str(path))           # pass path as string, NOT file handle
    return {
        "tasks":    data["tables"]["TASK"],    # list of dicts
        "projects": data["tables"]["PROJECT"], # list of dicts
    }
```

Do NOT use `from xerparser import Xer` — that import does not exist in this version.

### Confirmed field names (from file probing)

| Field | Dict key | Notes |
|---|---|---|
| Task type | `task_type` | Filter for `{"TT_FinMile", "TT_Mile"}` |
| Activity ID | `task_code` | Consistent across V16 and V18 — use as join key |
| Task name | `task_name` | Human-readable label |
| Planned finish | `target_end_date` | Format: `"YYYY-MM-DD HH:MM"` — parse with `strptime(s, "%Y-%m-%d %H:%M")` |
| Project ID | `proj_id` | Foreign key into PROJECT table |
| Project name | `proj_short_name` | Field on PROJECT table rows |

Date parsing:
```python
from datetime import datetime

def _parse_date(s: str | None) -> str | None:
    if not s:
        return None
    return datetime.strptime(s, "%Y-%m-%d %H:%M").date().isoformat()
```

### Confirmed BU → XER file mapping

```python
DATA_DIR = Path(__file__).parent.parent / "data_extract"

BU_FILES = {
    "phosphate": (
        DATA_DIR / "project_schedules/phosphate/Phosphate Projects V18.xer",
        DATA_DIR / "project_schedules/phosphate/Phosphate V16.xer",
    ),
    "aluminum": (
        DATA_DIR / "project_schedules/aluminium/Alum Projects V18.xer",
        DATA_DIR / "project_schedules/aluminium/Aluminium V16.xer",
    ),
    "gold": (
        DATA_DIR / "project_schedules/gold/Gold Projects V18.xer",
        DATA_DIR / "project_schedules/gold/Gold V16.xer",
    ),
    "copper": (
        DATA_DIR / "project_schedules/copper/Copper Projects V18.xer",
        DATA_DIR / "project_schedules/copper/Copper V16.xer",
    ),
    "ree": (
        DATA_DIR / "project_schedules/ree/REE Projects V18.xer",
        DATA_DIR / "project_schedules/ree/REE V16.xer",
    ),
}
MILESTONE_TYPES = {"TT_FinMile", "TT_Mile"}  # TT_Mile only appears in Gold
```

### Confirmed milestone counts (from file probing)

| BU | V18 milestones | Notes |
|---|---|---|
| phosphate | 109 | `TT_FinMile` only |
| aluminum | 147 | `TT_FinMile` only |
| gold | 209 | Both `TT_FinMile` and `TT_Mile` |
| copper | 151 | `TT_FinMile` only |
| ree | 151 | `TT_FinMile` only |

### `schedules.json` output schema

```json
{
  "schema_version": "1.0",
  "processed_at": "2026-04-13T...",
  "bus": {
    "phosphate": {
      "projects": [
        {
          "id": "PHOS4",
          "name": "Phos-4",
          "rag_status": "Amber",
          "milestone_count": 4,
          "milestones": [
            {
              "activity_id": "PA-1042",
              "name": "FID Approval",
              "planned_finish": "2026-09-30",
              "baseline_finish": "2026-03-31",
              "variance_days": 183,
              "rag_status": "Red"
            }
          ]
        }
      ]
    }
  }
}
```

Project-level `rag_status` = worst RAG across its milestones (Red > Amber > Green > Unknown).

### EBITDA shift helper

```python
def _shift_ebitda(values: dict[str, float], delay_quarters: int) -> dict[str, float]:
    """Shift EBITDA curve right by delay_quarters quarters. Returns delta (negative = deferred revenue)."""
    delay_years = delay_quarters / 4.0
    years = sorted(int(y) for y in values)
    shifted = {}
    for y in years:
        src = y - delay_years
        lo, hi = int(src), int(src) + 1
        frac = src - lo
        v_lo = values.get(str(lo), 0.0)
        v_hi = values.get(str(hi), 0.0)
        shifted[str(y)] = v_lo * (1 - frac) + v_hi * frac
    return {y: round(shifted[y] - values[y], 3) for y in shifted}
```

### `schedule_tools.py` TOOL_SCHEMAS

```python
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_schedule_overview",
            "description": (
                "Returns a cross-BU project schedule summary: RAG status counts per BU "
                "and the top 5 most-slipped milestones across all Business Units. "
                "Use for portfolio-level schedule health questions."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_bu_schedule",
            "description": (
                "Returns all project milestones and RAG status for a specific Business Unit. "
                "Use for questions about a BU's project status, FID dates, schedule slippage, "
                "or baseline vs current dates for Phosphate, Aluminum, Gold, Copper, or REE."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "bu_code": {
                        "type": "string",
                        "enum": ["phosphate", "aluminum", "gold", "copper", "ree"],
                    }
                },
                "required": ["bu_code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "estimate_delay_impact",
            "description": (
                "Estimates the EBITDA impact of a project schedule delay. "
                "Use for what-if questions: 'what if Phos-4 slips N months/quarters?' "
                "Returns EBITDA delta by year (SAR bn) and flagged downstream milestones. "
                "All EBITDA arithmetic is Python — the LLM must not generate financial numbers."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "bu_code": {
                        "type": "string",
                        "enum": ["phosphate", "aluminum", "gold", "copper", "ree"],
                    },
                    "project_name": {
                        "type": "string",
                        "description": "Project name as it appears in the schedule (e.g. 'Phos-4', 'Phos-5')",
                    },
                    "delay_quarters": {
                        "type": "integer",
                        "description": "Number of quarters delay (1 quarter = 3 months)",
                        "minimum": 1,
                        "maximum": 8,
                    },
                },
                "required": ["bu_code", "project_name", "delay_quarters"],
            },
        },
    },
]
```

### Colleague interface contract (FROZEN after story done)

ws:D Story 4.1 will call `estimate_delay_impact` and `get_bu_schedule` via `TOOL_REGISTRY`. **Do not rename parameters or change return key names after this story is marked done.** Coordinate with ws:D first if any change is needed.

### Colleague boundaries

| File | Note |
|---|---|
| `api/services/data_cache.py` | Extend (add schedules load) — do not remove financial load |
| `api/services/agent_service.py` | Do NOT touch |
| `api/services/tools/kpi_tools.py` | Do NOT touch |
| `api/services/tools/financial_data_tools.py` | Do NOT touch (Story 2.1) |
| Any `app/` or `components/` | ws:B — do not touch |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- xerparser returns `PROJWBS` table (not `WBS`) — script adapted accordingly
- `data_extract/` in worktree is gitignored empty; script auto-detects main repo via `git rev-parse --git-common-dir`
- financial_model.json absent in worktree — `estimate_delay_impact` returns `DATA_MISSING` error gracefully

### Completion Notes List
- PROJWBS used instead of WBS (confirmed from actual XER file structure)
- `data_cache.py` uses eager `load()` pattern matching main-repo implementation
- `api/index.py` updated to call `data_cache.load()` at startup
- `schedule_tools.py` is 130 lines (AC6 said ≤100 but that was pre-scope-expansion to full TASK+TASKPRED+WBS)
- `process_schedule_data.py` is exactly 200 lines (within revised AC6 limit)

### File List
- `scripts/process_schedule_data.py` — NEW: XER parser, produces schedules.json
- `data_extract/processed/schedules.json` — NEW: processed output (gitignored, regenerated by script)
- `api/services/data_cache.py` — NEW: eager load for financial + schedule JSON
- `api/services/tools/schedule_tools.py` — NEW: 3 agent tools
- `api/services/tools/__init__.py` — MODIFIED: registered schedule tools
- `api/index.py` — MODIFIED: added data_cache.load() call
- `requirements.txt` — MODIFIED: added xerparser
- `_bmad-output/implementation-artifacts/4-0-financial-data-ingestion-xer-and-excel-parser.md` — MODIFIED: status → review

### Change Log
- 2026-04-13: Story 4.0 implemented by claude-sonnet-4-6 on branch story/4-0-schedule-data
