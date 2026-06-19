---
title: 'Phos 3 Ph1 Detailed Schedule Integration'
type: 'feature'
created: '2026-04-13'
status: 'in-progress'
baseline_commit: 'a9ae5b906bd89665997dc907e37739f890f5ac30'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The three Phos 3 Phase 1 EPC XER snapshots (Sep 2024 baseline, Jan 2026, Feb 2026) contain ground-truth execution data — 22–30k activity-level tasks with actuals and forecasts — but are not loaded into the backend, so the LLM cannot answer any questions about Phosphate execution status.

**Approach:** Extend the existing `process_schedule_data.py` to also parse the three phos3_ph1 snapshots, appending a `detailed.phos3_ph1` key to `schedules.json`; add `get_phos3()` to `data_cache`; create three LLM tools; and update the Risk Radar system prompt.

## Boundaries & Constraints

**Always:**
- Use `parser(file_reader(path))` directly — the files contain non-standard relationship type "S1" that `Xer.reader()` rejects.
- RAG for milestones = variance of current finish vs the Sep 2024 `target_end_date`, matched by `task_code`. Green ≤ 0d, Amber 1–30d, Red > 30d, New = task not in baseline.
- `current_finish` = `act_end_date` if `status_code == TK_Complete`, else `early_end_date`.
- Tool responses must be LLM-context-safe: milestones capped at 100; progress aggregated by `task_code` prefix, never raw task dumps.
- Existing `BU_FILES` processing and `schedules.json` `bus` structure must be unchanged.

**Ask First:** None identified.

**Never:**
- Create a separate output JSON file — phos3 data goes inside the existing `schedules.json`.
- Replace or restructure the existing `_extract_bu` / `BU_FILES` logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path — summary | `get_phos3_summary()` | data_date, task_count, %complete, milestone RAG counts for latest snapshot | — |
| Milestone filter | `get_phos3_milestones(rag_filter="Red")` | Up to 100 Red milestones with name, dates, variance_days | — |
| Change query | `get_phos3_changes()` | tasks added, milestones delayed >30d vs baseline, milestone RAG breakdown | — |
| Data not loaded | Any phos3 tool before script has been run | `{"error": "Phos3 data not loaded. Run scripts/process_schedule_data.py first."}` | No exception |

</frozen-after-approval>

## Code Map

- `scripts/process_schedule_data.py` -- extend: add phos3_ph1 snapshot parsing and append `detailed.phos3_ph1` to output JSON
- `data_extract/processed/schedules.json` -- generated output; gains a top-level `detailed` key
- `api/services/data_cache.py` -- add `get_phos3() -> dict` helper (reads from existing `_schedules["detailed"]["phos3_ph1"]`)
- `api/services/tools/phos3_tools.py` -- new: `get_phos3_summary`, `get_phos3_milestones`, `get_phos3_changes` + TOOL_SCHEMAS
- `api/services/tools/__init__.py` -- import and register phos3 tools
- `api/agents.yaml` -- update Risk Radar `system_prompt` to call phos3 tools for Phosphate execution questions

## Tasks & Acceptance

**Execution:**
- [ ] `scripts/process_schedule_data.py` -- add `_parse_phos3_snapshots()` that parses the 3 XER files via `parser(file_reader())`, builds per-snapshot dict (data_date, counts, overall_pct_complete, milestones with RAG vs baseline, progress_by_prefix), computes change_summary baseline→feb26; extend `main()` to write result under `output["detailed"]["phos3_ph1"]`
- [ ] `api/services/data_cache.py` -- add `def get_phos3() -> dict: return _schedules.get("detailed", {}).get("phos3_ph1", {})`
- [ ] `api/services/tools/phos3_tools.py` -- create with `get_phos3_summary(snapshot="latest")`, `get_phos3_milestones(snapshot="latest", rag_filter="all", limit=100)`, `get_phos3_changes()` and their TOOL_SCHEMAS
- [ ] `api/services/tools/__init__.py` -- import phos3 TOOL_SCHEMAS and register all 3 functions in TOOL_REGISTRY
- [ ] `api/agents.yaml` -- append to Risk Radar system_prompt: for Phos 3 execution/EPC questions call `get_phos3_summary` then `get_phos3_milestones`; for snapshot comparison call `get_phos3_changes`

**Acceptance Criteria:**
- Given script runs successfully, when `schedules.json` is inspected, then it contains `detailed.phos3_ph1.latest_snapshot == "feb26"` and `snapshots.feb26.task_count == 29895`.
- Given `rag_filter="Red"`, when `get_phos3_milestones` is called, then all returned milestones have `variance_days > 30` and count ≤ 100.
- Given `schedules.json` has no `detailed` key, when any phos3 tool is called, then response is `{"error": "...Run scripts/process_schedule_data.py first."}`.
- Given Risk Radar is asked about Phos 3 execution status, when routed, then it calls `get_phos3_summary` before responding.

## Design Notes

**JSON structure under `detailed.phos3_ph1`:**
```json
{
  "latest_snapshot": "feb26",
  "change_summary": { "tasks_added_since_baseline": 7132, "milestones_red": 0, "milestones_amber": 0, "milestones_green": 0, "milestones_new": 0 },
  "snapshots": {
    "feb26": {
      "data_date": "2026-02-27", "task_count": 29895, "overall_pct_complete": 71.8,
      "milestones": [{ "task_code": "...", "task_name": "...", "status_code": "TK_Active",
        "current_finish": "2026-04-15", "baseline_finish": "2026-02-28", "variance_days": 46, "rag_status": "Red" }],
      "progress_by_prefix": { "WAS": { "total": 14485, "complete": 10400, "pct_complete": 71.8 } }
    }
  }
}
```

`progress_by_prefix` uses the first dot-segment of `task_code` (e.g. `WAS`, `4-E`, `KP1`) as contractor/discipline proxy. Only the three snapshots `baseline_sep24`, `jan26`, `feb26` are stored; `"latest_snapshot"` always points to `feb26`.

## Verification

**Commands:**
- `uv run scripts/process_schedule_data.py` -- expected: prints existing BU stats + phos3 snapshot stats, writes updated `schedules.json`
- `.venv/bin/python -c "from api.services.data_cache import load, get_phos3; load(); print(get_phos3()['latest_snapshot'])"` -- expected: `feb26`
