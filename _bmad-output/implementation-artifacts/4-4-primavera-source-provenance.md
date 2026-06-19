# Story 4.4: Primavera Source Provenance

**Story ID:** 4.4
**Story Key:** 4-4-primavera-source-provenance
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-14

<!-- Context: schedules.json contains no source attribution at the record level.
     Milestones and tasks know what they ARE but not WHERE they came from.
     The agent can answer "milestone P1005 is Red" but cannot cite "from file X.xer".
     FR24 requires DELIVERY ENGINE to cite ≥2 specific data points including source.

     This story adds source_file to every milestone and task record at preprocessing time,
     and adds a top-level "sources" manifest to schedules.json so agents can quote provenance.

     Dependency: Story 4-0 (schedule parser) must be done — the XER filenames are
     already loaded as constants in process_schedule_data.py, we just need to propagate them. -->

---

## Story

As DELIVERY ENGINE,
I want every milestone and task in schedules.json to carry a `source_file` field naming the XER
file it came from,
so that I can quote "Source: V18 XER — `H999481_v18.xer`" in my responses and satisfy FR24.

---

## Acceptance Criteria

**AC1 — Per-record source field on milestones**

In `scripts/process_schedule_data.py`, every milestone dict in
`schedules["bus"][bu]["milestones"]` gains a `"source_file"` key equal to the basename of the
V18 XER file used for that BU (e.g. `"H999481-MU-P-001_V18.xer"`).

**AC2 — Per-record source field on tasks**

Every task dict in `schedules["bus"][bu]["tasks"]` gains the same `"source_file"` field.

**AC3 — Phos3 snapshot source field**

Every milestone in each Phos3 snapshot (`schedules["detailed"]["phos3_ph1"]["snapshots"]
[snapshot_name]["milestones"]`) gains `"source_file"` equal to the basename of the XER file
that produced that snapshot (e.g. `"phos3_ph1_feb26.xer"`).

**AC4 — Top-level sources manifest**

`schedules.json` gains a top-level `"sources"` block:

```json
"sources": {
  "phosphate": {
    "current": "<basename of V18 XER>",
    "baseline": "<basename of V16 XER>",
    "extracted_at": "<ISO datetime>"
  },
  "aluminum": { ... },
  "gold":     { ... },
  "copper":   { ... },
  "ree":      { ... },
  "phos3_ph1_snapshots": {
    "baseline_sep24": "<xer basename>",
    "jan26":          "<xer basename>",
    "feb26":          "<xer basename>"
  }
}
```

**AC5 — Existing structure unchanged**

All existing keys in milestones and tasks are preserved. No existing tools
(`get_bu_schedule`, `get_schedule_overview`, `get_phos3_*`) are modified — they pass through
whatever fields are present. Schema version bumped to `"2.1"`.

**AC6 — Data catalogue updated**

`api/config/data_catalogue.md` Data Source 1 note updated to mention:
> Milestones and tasks carry a `source_file` field identifying the originating XER file.

---

## Tasks / Subtasks

- [x] T1: Update `scripts/process_schedule_data.py` (AC1, AC2, AC3, AC4, AC5)
  - [x] T1.1: Identify the XER file basename variable for each BU (already in the script as
        path constants) — extract with `Path(xer_path).name`
  - [x] T1.2: In the milestone-building loop, add `"source_file": xer_basename` to each dict
  - [x] T1.3: In the task-building loop, same addition
  - [x] T1.4: In Phos3 snapshot processing, add `"source_file"` using the snapshot-specific XER path
  - [x] T1.5: Build the `"sources"` dict and inject at top level before writing JSON
  - [x] T1.6: Bump `"schema_version"` from `"2.0"` to `"2.1"`
  - [x] T1.7: Rerun: `.venv/bin/python scripts/process_schedule_data.py` — confirm output valid

- [x] T2: Update `api/config/data_catalogue.md` (AC6)
  - [x] T2.1: In Data Source 1 section add one-line note about `source_file` field

- [x] T3: Verify
  - [x] T3.1: `jq '.sources' data_extract/processed/schedules.json` shows all BUs + phos3 snapshots
  - [x] T3.2: `jq '.bus.phosphate.milestones[0].source_file' ...` returns a non-null string
  - [x] T3.3: Confirm existing tools still return correct data (no regression in tool output shape)

---

## Dev Notes

### XER file path constants in process_schedule_data.py

The script already has per-BU XER path variables. Use `Path(xer_path).name` to get just the
basename — do NOT store full absolute paths in the JSON (portability + security).

### Phos3 snapshots

The Phos3 detailed section processes multiple XER snapshots sequentially. Each snapshot has its
own source file. The `source_file` field should reflect the snapshot's specific XER, not the
BU-level current/baseline pair.

### DO NOT touch

| File | Reason |
|---|---|
| `api/services/tools/schedule_tools.py` | Pass-through — source_file flows automatically |
| `api/services/tools/phos3_tools.py` | Same — no changes needed |
| `api/services/data_cache.py` | Loads JSON as-is — no changes needed |
| Any frontend file | ws:B only |

### File size impact

Adding `"source_file"` to ~800 milestones + ~3000 tasks + ~3000 Phos3 milestones at ~30 chars
each ≈ +200 KB to schedules.json. Current size is ~1.5 MB → expected ~1.7 MB. Well within limits.

---

## Previous Story Intelligence (Story 4.0 / 4.3)

- XER filenames are already used in process_schedule_data.py as path constants — no new file discovery logic needed
- `data_extract/` files are gitignored in worktrees — run `process_schedule_data.py` locally to regenerate `schedules.json`
- `api/config/data_catalogue.md` is loaded at module init via `agent_registry.py` (Story 4.3) — edit the file directly; no code change needed to pick up the update
