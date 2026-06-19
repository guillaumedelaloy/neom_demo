# Story 4.9: Activity Code Tagging

**Story ID:** 4.9
**Story Key:** 4-9-activity-code-tagging
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** ready-for-dev
**Date Created:** 2026-04-14

<!-- Context: Every task in the XER carries structured labels assigned via the
     TASKACTV table. Phosphate alone has 3,032 label assignments across 8 code
     types:

       1247 | NEOM: Stage Gate     (Feasibility Study | Stage 3, Execution | Stage 4, …)
       1248 | NEOM: Projects       (Ammonia & Urea Phos 4, MPC, MWSPC, …)
       1251 | NEOM: Commodity      (Phosphate, Aluminium, Gold, …)
       1262 | NEOM: Region         (Central Province, North Region, …)
       1265 | NEOM: Clusters       (Jabal Abu Ad Dun, …)
       1274 | NEOM: Type           (Growth, Sustaining, Enablers, …)
       1275 | NEOM: Groups         (EPC, Exploration, …)
       1277 | NEOM: Support Functions

     Without this mapping, the agent cannot answer "what enabler is most
     critical for Jabal Abu Ad Dun?" because there is no way to filter tasks
     by cluster, stage gate, or type.

     This story joins ACTVTYPE + ACTVCODE + TASKACTV onto every task and
     milestone record, and adds a top-level actvcode_index for fast lookup.

     Dependency: Story 4.8 must be done first (enriched records are the base
     to augment). Schema bumped 2.2 → 2.3. -->

---

## Story

As DELIVERY ENGINE,
I want every task and milestone in schedules.json to carry its activity code
labels (stage gate, cluster, type, commodity, region),
so that I can filter and group by any of these dimensions when answering
questions like "which Execution | Stage 4 milestones in Jabal Abu Ad Dun are Red?"

---

## Acceptance Criteria

**AC1 — Top-level actvcode_index in schedules.json**

`schedules.json` gains a top-level `"actvcode_index"` block, built from the
union of all BU XER files:

```json
"actvcode_index": {
  "NEOM: Stage Gate": [
    {"id": "71830", "code": "Feasibility Study | Stage 3"},
    {"id": "71832", "code": "Execution | Stage 4"}
  ],
  "NEOM: Projects": [...],
  "NEOM: Commodity": [...],
  "NEOM: Region": [...],
  "NEOM: Clusters": [...],
  "NEOM: Type": [...],
  "NEOM: Groups": [...],
  "NEOM: Support Functions": [...]
}
```

Each entry uses the human-readable `actv_code_type` name as the key.
Within each list, entries are sorted by `seq_num`.

**AC2 — activity_codes dict on every BU task**

Every task dict in `schedules["bus"][bu]["tasks"]` gains:

```json
"activity_codes": {
  "NEOM: Stage Gate":      {"id": "71832", "code": "Execution | Stage 4"},
  "NEOM: Projects":        {"id": "71843", "code": "Ammonia & Urea Phos 4"},
  "NEOM: Commodity":       {"id": "...",   "code": "Phosphate"},
  "NEOM: Region":          {"id": "...",   "code": "Central Province"},
  "NEOM: Clusters":        {"id": "...",   "code": "Jabal Abu Ad Dun"},
  "NEOM: Type":            {"id": "...",   "code": "Growth"}
}
```

Keys are only included when a label is assigned (most tasks won't have all 8
types). A task with no TASKACTV entries gets `"activity_codes": {}`.

**AC3 — activity_codes dict on every BU milestone**

Same as AC2, applied to every milestone in `schedules["bus"][bu]["milestones"]`.

**AC4 — activity_codes on Phos3 snapshot milestones**

The Phos3 Ph1 snapshot milestones in `schedules["detailed"]["phos3_ph1"]["snapshots"]`
also gain `"activity_codes"`. The Phos3 XER files share the global ACTVTYPE/ACTVCODE
definitions — build the task→codes mapping from each snapshot XER.

**AC5 — Schema version bumped to 2.3**

`"schema_version"` updated to `"2.3"`.

**AC6 — Existing fields untouched**

All previously-present keys on tasks, milestones, and the top-level `"sources"`
block are preserved.

---

## Tasks / Subtasks

- [ ] T1: Add `_build_actv_maps(tables)` helper in `process_schedule_data.py`
  - [ ] T1.1: Build `type_name_map: dict[str, str]` — `actv_code_type_id → actv_code_type`
        from `tables["ACTVTYPE"]`
  - [ ] T1.2: Build `code_map: dict[str, dict]` — `actv_code_id → {type_name, code}`
        from `tables["ACTVCODE"]`, joined on `actv_code_type_id`
  - [ ] T1.3: Build `task_codes: dict[str, dict]` — `task_id → {type_name: {id, code}}`
        from `tables["TASKACTV"]`, joined on `code_map`
  - [ ] T1.4: Return `(task_id_codes_map, code_index_by_type)`

- [ ] T2: Build top-level `actvcode_index` in `main()` (AC1)
  - [ ] T2.1: Call `_build_actv_maps()` on the first available BU's V18 tables
        (types are global/shared — any BU XER has the full type+code list)
  - [ ] T2.2: Sort each type's codes by `seq_num` before writing
  - [ ] T2.3: Inject at top-level key `"actvcode_index"` before writing JSON

- [ ] T3: Update `_extract_bu(v18_path, v16_path)` to call `_build_actv_maps()` and
        attach `activity_codes` to each milestone and task (AC2, AC3)
  - [ ] T3.1: Build `task_id_codes` map inside `_extract_bu()`
  - [ ] T3.2: Look up by `t["task_id"]` (not task_code — TASKACTV joins on task_id)
  - [ ] T3.3: Attach `"activity_codes": task_id_codes.get(t["task_id"], {})` to each record

- [ ] T4: Update `_parse_snapshot()` to accept and attach activity codes (AC4)
  - [ ] T4.1: Add `task_id_codes: dict` parameter (default `{}`)
  - [ ] T4.2: Update `_parse_phos3_snapshots()` to build codes map from each snapshot XER
        and pass it in
  - [ ] T4.3: Attach `"activity_codes"` to each phos3 milestone

- [ ] T5: Bump `schema_version` to `"2.3"` (AC5)

- [ ] T6: Verify
  - [ ] T6.1: `jq '.actvcode_index | keys'` — expect 8 type names
  - [ ] T6.2: `jq '.bus.phosphate.tasks[0].activity_codes'` — expect dict with ≥1 key
  - [ ] T6.3: Filter tasks by cluster:
        `jq '[.bus.phosphate.tasks[] | select(.activity_codes["NEOM: Clusters"] != null)] | length'`
  - [ ] T6.4: `jq '.bus.phosphate.milestones[0].activity_codes'` — non-null dict
  - [ ] T6.5: `jq '.schema_version'` — expect `"2.3"`

---

## Dev Notes

### Join key is task_id, not task_code

TASKACTV links on `task_id` (numeric Primavera internal ID), not `task_code`
(e.g. "P1005"). Both are on the TASK record. Build the lookup dict using `task_id`
so the join is exact:

```python
task_id_codes = {}
for row in tables.get("TASKACTV", []):
    tid = row["task_id"]
    code_entry = code_map.get(row["actv_code_id"])
    if code_entry:
        task_id_codes.setdefault(tid, {})[code_entry["type_name"]] = {
            "id": row["actv_code_id"],
            "code": code_entry["code"],
        }
```

### ACTVTYPE/ACTVCODE are global across BUs

The 8 ACTVTYPE entries (Stage Gate, Projects, Commodity, Region, Clusters, Type,
Groups, Support Functions) and their ACTVCODE children are identical across all
BU XER files — they are global codes, not project-specific. Building the
`actvcode_index` from one BU's XER (e.g. Phosphate V18) is sufficient for the
top-level index. But `TASKACTV` is BU-specific — build per-BU within `_extract_bu()`.

### Phos3 snapshot XER files

The Phos3 XERs are parsed via `xer_parser(xer_file_reader(str(path)))`. The same
TASKACTV/ACTVCODE/ACTVTYPE tables are present. Build `_build_actv_maps()` from
each snapshot's `tables` dict and pass the resulting `task_id_codes` into
`_parse_snapshot()`.

### Empty activity_codes

Tasks with no TASKACTV entries (rare but possible) get `"activity_codes": {}`.
This is intentional — it distinguishes "not labelled" from "not available".

### DO NOT touch

| File | Reason |
|---|---|
| `api/services/tools/schedule_tools.py` | Pass-through |
| `api/services/tools/phos3_tools.py` | Pass-through |
| `api/config/data_catalogue.md` | Update in a separate editorial pass if needed |
