# Story 4.8: XER Task & Milestone Field Enrichment

**Story ID:** 4.8
**Story Key:** 4-8-xer-task-milestone-enrichment
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** ready-for-dev
**Date Created:** 2026-04-14

<!-- Context: The current schedules.json has severely stripped-down records.
     Milestones carry 9 fields; tasks carry 9 fields. The source XER TASK table
     has ~55 fields. Critical gaps that block real analysis:

     FLOAT — total_float_hr_cnt and free_float_hr_cnt are entirely absent.
     Every Phosphate task has float data; Aluminum has 544 tasks all with float.
     Float is the primary scheduling metric for criticality identification.

     STATUS & COMPLETION — status_code (TK_NotStart/TK_Active/TK_Complete) and
     phys_complete_pct are absent from BU milestones and tasks, making it
     impossible to distinguish planned from in-progress from complete records.
     (Phos3 snapshots already capture these — this brings BU records in line.)

     START DATES — milestones have no start date at all. Only planned_finish is
     stored. For delay analysis you need early_end (current schedule), late_end
     (float limit), and actual start/end when activities are underway.

     TASK BASELINE — V16 baseline_finish exists for milestones but NOT for tasks.
     Of 379 Phosphate tasks, 351 have V16 equivalents — slippage at task level is
     entirely unreportable today.

     Dependency: Story 4.4 must be done (source_file field already added).
     Schema bumped 2.1 → 2.2. -->

---

## Story

As DELIVERY ENGINE,
I want every task and milestone record in schedules.json to carry float, status,
actual progress, and start-date fields from the XER,
so that I can answer "what are the critical path activities for Gold?" and
"how many tasks in Phosphate are behind schedule?" without being blind to
two-thirds of the available scheduling data.

---

## Acceptance Criteria

**AC1 — Float fields on all BU milestones and tasks**

`scripts/process_schedule_data.py`: every milestone and task dict in
`schedules["bus"][bu]["milestones"]` and `schedules["bus"][bu]["tasks"]` gains:
- `"total_float_hr"`: integer (hours), `null` if XER field is empty
- `"free_float_hr"`: integer (hours), `null` if XER field is empty
- `"driving_path"`: boolean (`true` when `driving_path_flag == "Y"`, else `false`)

**AC2 — Status and completion on all BU milestones and tasks**

Every milestone and task dict gains:
- `"status_code"`: string — one of `"TK_NotStart"`, `"TK_Active"`,
  `"TK_Complete"`, `"TK_Suspend"` (pass through raw value; `null` if empty)
- `"phys_complete_pct"`: integer 0–100 (coerce `""` → `null`)

**AC3 — Actual start/end dates on all BU milestones and tasks**

Every milestone and task dict gains:
- `"act_start"`: ISO date string, `null` if `act_start_date` is empty
- `"act_end"`: ISO date string, `null` if `act_end_date` is empty

**AC4 — Start-date fields on BU milestones**

Every milestone dict (not tasks — tasks already have `planned_start`) gains:
- `"target_start"`: ISO date string from `target_start_date`
- `"early_end"`: ISO date string from `early_end_date` (current schedule finish)
- `"late_end"`: ISO date string from `late_end_date` (latest-allowable finish)

**AC5 — Remaining and target duration on BU tasks**

Every task dict gains:
- `"remain_drtn_hr"`: integer (hours), `null` if empty
- `"target_drtn_hr"`: integer (hours), `null` if empty

**AC6 — Baseline finish and variance on BU tasks**

Every task dict gains:
- `"baseline_finish"`: ISO date from V16 `target_end_date` for matching
  `task_code`, `null` for the 28 tasks added after the V16 baseline
- `"variance_days"`: integer delta (planned_finish − baseline_finish in calendar
  days), `null` when baseline_finish is null

**AC7 — Float fields on Phos3 snapshot milestones**

Every milestone in `schedules["detailed"]["phos3_ph1"]["snapshots"][*]["milestones"]`
gains `"total_float_hr"`, `"free_float_hr"`, and `"driving_path"` fields
(same rules as AC1). The existing `status_code`, `phys_complete_pct`,
`act_end`/`current_finish` fields are already present — do not duplicate.

**AC8 — Schema version bumped to 2.2**

`"schema_version"` field updated to `"2.2"`.

**AC9 — Existing fields untouched**

All previously-present keys on milestones and tasks are preserved with identical
values. `source_file` (from 4.4), `rag_status`, `variance_days` on milestones,
`project_name`, `wbs_id` — all unchanged.

---

## Tasks / Subtasks

- [ ] T1: Add helper `_parse_int(val) → int | None` — converts empty strings to `null`
- [ ] T2: Update `_extract_bu(v18_path, v16_path)` — enrich milestone records (AC1–AC4)
  - [ ] T2.1: Add float fields (`total_float_hr`, `free_float_hr`, `driving_path`)
  - [ ] T2.2: Add status/progress fields (`status_code`, `phys_complete_pct`, `act_start`, `act_end`)
  - [ ] T2.3: Add start-date fields (`target_start`, `early_end`, `late_end`)
- [ ] T3: Update `_extract_bu()` — enrich task records (AC5–AC6)
  - [ ] T3.1: Add float + status + actual dates + duration fields
  - [ ] T3.2: Build `baseline_finish_tasks` index from V16 (same pattern as milestones)
  - [ ] T3.3: Add `baseline_finish` and `variance_days` to each task
- [ ] T4: Update `_parse_snapshot()` — add float fields to phos3 milestone records (AC7)
- [ ] T5: Bump `schema_version` to `"2.2"` in `main()` (AC8)
- [ ] T6: Rerun `process_schedule_data.py` and verify
  - [ ] T6.1: `jq '.bus.phosphate.milestones[0] | {total_float_hr, driving_path, status_code, target_start}'`
  - [ ] T6.2: `jq '.bus.phosphate.tasks[0] | {total_float_hr, status_code, baseline_finish, variance_days}'`
  - [ ] T6.3: `jq '[.bus.phosphate.tasks[] | select(.driving_path == true)] | length'` — expect ~3
  - [ ] T6.4: `jq '.schema_version'` — expect `"2.2"`

---

## Dev Notes

### Helper pattern for empty-string integers

XER stores numeric fields as strings; empty string = not set. Use:
```python
def _parse_int(val: str | None) -> int | None:
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None
```

Apply to: `total_float_hr_cnt`, `free_float_hr_cnt`, `remain_drtn_hr_cnt`,
`target_drtn_hr_cnt`, `phys_complete_pct`.

### driving_path_flag

`"Y"` → `True`, anything else → `False`. All tasks have this field; it is never empty.

### Milestone late_end vs early_end

`early_end_date` = current schedule finish (what the network says if work stays on
track). `late_end_date` = latest allowable finish before it absorbs all float and
hits the project end. The gap between them is float expressed as a date range.
Note: for milestones, `early_end_date` == `target_end_date` (which is already
stored as `planned_finish`) — store both; callers may alias them.

### V16 baseline for tasks

The existing `baseline_finish` on milestones is built as:
```python
baseline_finish = {t["task_code"]: t["target_end_date"] for t in v16["TASK"]}
```
Reuse the same dict for tasks. Tasks in V18 that have no V16 entry get
`"baseline_finish": null, "variance_days": null`.

For Phosphate: V16 has 351 tasks, V18 has 379 — 28 tasks are new-to-V18.

### Phos3 float

The snapshot XER files parsed via `xer_parser(xer_file_reader(...))` expose the same
TASK table. Float is available in all three snapshots. Add it to each milestone in
`_parse_snapshot()` — use `_parse_int(t.get("total_float_hr_cnt"))` for safety.

### DO NOT touch

| File | Reason |
|---|---|
| `api/services/tools/schedule_tools.py` | Pass-through — new fields flow automatically |
| `api/services/tools/phos3_tools.py` | Same |
| Any frontend file | ws:B only |
