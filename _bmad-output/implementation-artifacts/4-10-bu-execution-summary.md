# Story 4.10: BU Execution Summary

**Story ID:** 4.10
**Story Key:** 4-10-bu-execution-summary
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** ready-for-dev
**Date Created:** 2026-04-14

<!-- Context: schedules["detailed"]["phos3_ph1"] has rich summary statistics —
     task_count, complete_count, active_count, not_started_count,
     overall_pct_complete, data_date, milestones RAG counts,
     progress_by_prefix. None of this exists for the 5 main BUs.

     A question like "how is Aluminum tracking overall — what % complete and
     how many tasks are Red?" is unanswerable today because the BU-level
     output is just flat lists with no aggregation.

     This story adds a phos3-style "summary" block to every BU, using the
     same status_code + phys_complete_pct fields added in Story 4.8. It also
     adds per-project breakdown within each BU (progress_by_project) so
     the agent can drill from BU → individual project.

     Dependency: Story 4.8 must be done (status_code + phys_complete_pct
     now on every BU task). Schema bumped 2.3 → 2.4 (or 2.2 → 2.3 if 4.9
     runs after this — apply the next available version number sequentially). -->

---

## Story

As DELIVERY ENGINE,
I want `schedules["bus"][bu]` to include an execution summary block with
aggregate completion statistics and per-project breakdown,
so that I can answer "which BU is furthest behind?" and "what is overall
progress for Aluminum?" from a single tool call.

---

## Acceptance Criteria

**AC1 — summary block on every BU**

`schedules["bus"][bu]` gains a `"summary"` key structured as:

```json
"summary": {
  "task_count": 379,
  "complete_count": 0,
  "active_count": 0,
  "not_started_count": 379,
  "overall_pct_complete": 0.0,
  "milestone_count": 109,
  "milestone_rag": {"Green": 109, "Amber": 0, "Red": 0, "Unknown": 0},
  "extracted_at": "<ISO datetime from main()>"
}
```

- `overall_pct_complete`: mean of `phys_complete_pct` across all tasks (0–100,
  rounded to 1 decimal), computed from `status_code` + `phys_complete_pct`
- `milestone_rag`: aggregated from the milestone list already computed in
  `_extract_bu()` (same dict that goes into `output["bus"][bu]["milestones"]`)
- `extracted_at`: same timestamp as top-level `processed_at` (pass it in)

**AC2 — progress_by_project breakdown**

`schedules["bus"][bu]` gains a `"progress_by_project"` key:

```json
"progress_by_project": {
  "MPC": {
    "proj_id": "843",
    "task_count": 45,
    "complete_count": 0,
    "active_count": 2,
    "milestone_count": 12,
    "milestone_rag": {"Green": 8, "Amber": 2, "Red": 2, "Unknown": 0},
    "pct_complete": 0.0
  },
  "MWSPC": {...},
  ...
}
```

Key is `proj_short_name` from the PROJECT table (already used in `_project_name_map()`).
Sorted by `task_count` descending.

**AC3 — critical_path_candidates list on each BU**

`schedules["bus"][bu]` gains:

```json
"critical_path_candidates": [
  {"activity_id": "P1005", "name": "...", "project_name": "...", "planned_finish": "..."},
  ...
]
```

Tasks and milestones where `driving_path == true` (from Story 4.8), sorted by
`planned_finish` ascending. Empty list `[]` if none.

**AC4 — Schema version bumped**

`"schema_version"` updated to the next integer minor after whatever 4.8 and 4.9
leave it at (`"2.4"` if both precede this story, otherwise adjust).

**AC5 — Existing structure unchanged**

`"milestones"`, `"tasks"`, `"dependencies"`, `"wbs"` keys on each BU are
unchanged in content and structure.

---

## Tasks / Subtasks

- [ ] T1: Add `_build_bu_summary(milestones, tasks, extracted_at)` helper
  - [ ] T1.1: Count task statuses from `status_code` field
  - [ ] T1.2: Compute `overall_pct_complete` as mean of `phys_complete_pct`
  - [ ] T1.3: Aggregate milestone RAG counts
  - [ ] T1.4: Return summary dict matching AC1 schema

- [ ] T2: Add `_build_progress_by_project(milestones, tasks)` helper
  - [ ] T2.1: Group tasks by `project_name`; count per-project stats
  - [ ] T2.2: Group milestones by `project_name`; aggregate RAG per project
  - [ ] T2.3: Sort result by task_count descending
  - [ ] T2.4: Return dict matching AC2 schema

- [ ] T3: Add `_build_critical_path_candidates(milestones, tasks)` helper
  - [ ] T3.1: Filter combined list where `driving_path == True`
  - [ ] T3.2: Pick fields: `activity_id`, `name`, `project_name`, `planned_finish`
  - [ ] T3.3: Sort by `planned_finish` ascending (nulls last)

- [ ] T4: Call helpers in `main()` after `_extract_bu()` returns; inject into
        `output["bus"][bu]`

- [ ] T5: Bump `schema_version` in `main()` (AC4)

- [ ] T6: Verify
  - [ ] T6.1: `jq '.bus.phosphate.summary'` — shows task_count=379, milestone_count=109
  - [ ] T6.2: `jq '.bus.aluminum.summary.task_count'` — expect 544
  - [ ] T6.3: `jq '.bus.phosphate.progress_by_project | keys'` — list of project names
  - [ ] T6.4: `jq '.bus.phosphate.critical_path_candidates | length'` — expect ≥1
        (Gold and Copper have driving_path tasks)
  - [ ] T6.5: `jq '[.bus | to_entries[] | {bu: .key, pct: .value.summary.overall_pct_complete}]'`
        — shows all BUs with their overall completion

---

## Dev Notes

### Dependency on Story 4.8

This story reads `status_code`, `phys_complete_pct`, and `driving_path` from the
task/milestone records in memory — it does NOT re-parse the XER. `_extract_bu()`
must have already enriched these fields (Story 4.8). The helpers in this story
operate on the already-built `milestones` and `tasks` lists returned by
`_extract_bu()`, so the call order in `main()` is natural.

### phys_complete_pct is a string in the XER

Story 4.8 will store it as `int | None`. Treat `None` as 0 for the mean
calculation (tasks with no pct set are effectively 0% complete). Guard:
```python
pcts = [t["phys_complete_pct"] or 0 for t in tasks]
overall = round(sum(pcts) / len(pcts), 1) if pcts else 0.0
```

### Project name as key

`project_name` comes from `_project_name_map()` which uses `proj_short_name`.
Some tasks may have an empty project_name (if the proj_id has no short_name).
Group these under `"(unknown)"`.

### Phosphate has all TK_NotStart in V18

V18 is a planning baseline — no actual progress recorded at the BU level.
All five BUs will show `complete_count: 0` for Phosphate. This is expected and
correct; it reflects what the V18 schedule file contains.

### DO NOT touch

| File | Reason |
|---|---|
| `api/services/tools/schedule_tools.py` | `get_bu_schedule` passes through the full BU dict — new keys flow automatically |
| `api/config/data_catalogue.md` | Update in a separate editorial pass |
