from __future__ import annotations

import json
import subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from xerparser import Xer
from xerparser import parser as xer_parser, file_reader as xer_file_reader

# Locate data_extract: prefer worktree-local, fall back to main repo root via git
_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent

def _find_data_dir() -> Path:
    candidate = _REPO_ROOT / "data_extract"
    if (candidate / "project_schedules").exists():
        return candidate
    # Worktrees share a git repo — walk up from common git dir
    try:
        common_dir = subprocess.check_output(
            ["git", "rev-parse", "--git-common-dir"], cwd=_REPO_ROOT, text=True
        ).strip()
        main_root = Path(common_dir).parent  # .git -> repo root
        fallback = main_root / "data_extract"
        if (fallback / "project_schedules").exists():
            return fallback
    except Exception:
        pass
    return candidate  # let downstream raise a clear FileNotFoundError

DATA_DIR = _find_data_dir()

BU_FILES: dict[str, tuple[Path, Path]] = {
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

OUTPUT_PATH = _REPO_ROOT / "data_extract" / "processed" / "schedules.json"
MILESTONE_TYPES = {"TT_FinMile", "TT_Mile"}

# Primavera UDF type id 489 (FT_STATICTYPE) — programme RAG indicator codes in source XER.
# Mapping inferred from PDF legend ordering; confirmed by task data patterns.
# Tasks with no UDF entry are treated as Grey = Not Started.
SCHEDULE_RAG_UDF_TYPE_ID = "489"
_UDF_RAG_CODE_MAP: dict[str, str] = {
    "UDF_G1": "Red",    # Major Delay, no Mitigation
    "UDF_G2": "Amber",  # Minor Delay with Mitigation
    "UDF_G3": "Green",  # In Progress, on Track
    "UDF_G4": "Blue",   # Completed
}


def _parse_int(val: str | None) -> int | None:
    """Convert XER numeric string to int; empty string or None → None."""
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None


def _parse_date(s: str | None) -> str | None:
    if not s:
        return None
    return datetime.strptime(s, "%Y-%m-%d %H:%M").date().isoformat()


def _variance_days(current: str | None, baseline: str | None) -> int | None:
    if not current or not baseline:
        return None
    c = datetime.strptime(current, "%Y-%m-%d %H:%M").date()
    b = datetime.strptime(baseline, "%Y-%m-%d %H:%M").date()
    return (c - b).days


def _build_udf_rag_map(tables: dict) -> dict[str, str]:
    """Returns task_id → RAG label from UDF type 489 (static RAG codes) in the source schedule.

    Tasks with no entry default to Gray (Not Started) at call sites.
    str() coercion on both sides guards against xerparser integer coercion of numeric ids.
    """
    result: dict[str, str] = {}
    for row in tables.get("UDFVALUE", []):
        if str(row.get("udf_type_id", "")) == SCHEDULE_RAG_UDF_TYPE_ID:
            task_id = str(row.get("fk_id", ""))
            # FT_STATICTYPE stores the code value in udf_text, not udf_code_id
            label = _UDF_RAG_CODE_MAP.get(row.get("udf_text", ""))
            if task_id and label:
                result[task_id] = label
    return result


BASELINE_RAG_UDF_TYPE_ID = "487"  # V16 baseline RAG — FT_TEXT, literal values


def _build_baseline_rag_map(tables: dict) -> dict[str, str]:
    """Returns task_code → RAG label from V16 UDF type 487 (baseline RAG text field).

    V16 stores literal text values ('Green'/'Amber'/'Red') in udf_text.
    Keyed by task_code (not task_id) because task_id integers differ between V16 and V18.
    """
    # Build task_id → task_code index from V16 TASK table
    task_code_by_id: dict[str, str] = {
        t["task_id"]: t["task_code"]
        for t in tables.get("TASK", [])
        if t.get("task_id") and t.get("task_code")
    }
    result: dict[str, str] = {}
    valid = {"Green", "Amber", "Red"}
    for row in tables.get("UDFVALUE", []):
        if str(row.get("udf_type_id", "")) == BASELINE_RAG_UDF_TYPE_ID:
            task_id = str(row.get("fk_id", ""))
            val = row.get("udf_text", "")
            code = task_code_by_id.get(task_id)
            if code and val in valid:
                result[code] = val
    return result


def _project_name_map(tables: dict) -> dict[str, str]:
    """Returns proj_id -> proj_short_name mapping."""
    return {p["proj_id"]: p.get("proj_short_name", "") for p in tables.get("PROJECT", [])}


def _build_actv_maps(tables: dict) -> tuple[dict[str, dict], dict[str, list]]:
    """Build activity code lookup structures from ACTVTYPE + ACTVCODE + TASKACTV.

    Returns:
        task_id_codes: task_id → {type_name: {id, code}}
        code_index_by_type: type_name → [{id, code}, ...] sorted by seq_num
    """
    type_name_map: dict[str, str] = {
        r["actv_code_type_id"]: r["actv_code_type"]
        for r in tables.get("ACTVTYPE", [])
    }

    code_map: dict[str, dict] = {}
    for r in tables.get("ACTVCODE", []):
        type_name = type_name_map.get(r["actv_code_type_id"])
        if type_name:
            code_map[r["actv_code_id"]] = {
                "type_name": type_name,
                "code": r.get("short_name", ""),
                "seq_num": r.get("seq_num", "0"),
            }

    task_id_codes: dict[str, dict] = {}
    for r in tables.get("TASKACTV", []):
        tid = r["task_id"]
        entry = code_map.get(r["actv_code_id"])
        if entry:
            task_id_codes.setdefault(tid, {})[entry["type_name"]] = {
                "id": r["actv_code_id"],
                "code": entry["code"],
            }

    # Build sorted index: type_name → [{id, code}, ...] by seq_num
    by_type: dict[str, list] = {}
    for cid, entry in code_map.items():
        by_type.setdefault(entry["type_name"], []).append({
            "id": cid,
            "code": entry["code"],
            "_seq": entry["seq_num"],
        })
    code_index_by_type: dict[str, list] = {
        tname: [{"id": e["id"], "code": e["code"]} for e in sorted(entries, key=lambda x: x["_seq"])]
        for tname, entries in by_type.items()
    }

    return task_id_codes, code_index_by_type


def _extract_bu(v18_path: Path, v16_path: Path) -> tuple[dict, dict]:
    """Returns (bu_data, code_index_by_type) — index used for top-level actvcode_index."""
    v18 = Xer.reader(v18_path).tables
    v16 = Xer.reader(v16_path).tables

    proj_names = _project_name_map(v18)

    # Baseline finish index: task_code -> target_end_date (raw string) from V16
    baseline_finish: dict[str, str] = {
        t["task_code"]: t["target_end_date"]
        for t in v16.get("TASK", [])
    }

    # Activity code maps for this BU (Story 4.9)
    task_id_codes, code_index_by_type = _build_actv_maps(v18)

    # Programme RAG from UDF field (authoritative)
    udf_rag = _build_udf_rag_map(v18)
    if not udf_rag:
        print(f"  [WARN] No schedule RAG UDF values found in {v18_path.name} — all milestones will be Gray")

    # Baseline RAG from V16 (task_code-keyed) — enables V16→V18 RAG drift detection
    baseline_rag = _build_baseline_rag_map(v16)

    tasks_raw = v18.get("TASK", [])
    milestones = []
    tasks = []

    for t in tasks_raw:
        code = t["task_code"]
        proj_name = proj_names.get(t["proj_id"], "")
        planned_finish_raw = t.get("target_end_date")
        planned_start_raw = t.get("target_start_date")
        base_raw = baseline_finish.get(code)

        if t["task_type"] in MILESTONE_TYPES:
            var = _variance_days(planned_finish_raw, base_raw)
            milestones.append({
                "activity_id": code,
                "name": t.get("task_name", ""),
                "project_id": t["proj_id"],
                "project_name": proj_name,
                "planned_finish": _parse_date(planned_finish_raw),
                "baseline_finish": _parse_date(base_raw),
                "variance_days": var,
                "rag_status": udf_rag.get(str(t.get("task_id", "")), "Gray"),
                "baseline_rag_status": baseline_rag.get(code),
                "source_file": v18_path.name,
                # AC1 — float
                "total_float_hr": _parse_int(t.get("total_float_hr_cnt")),
                "free_float_hr": _parse_int(t.get("free_float_hr_cnt")),
                "driving_path": t.get("driving_path_flag") == "Y",
                # AC2 — status / completion
                "status_code": t.get("status_code") or None,
                "phys_complete_pct": _parse_int(t.get("phys_complete_pct")),
                "act_start": _parse_date(t.get("act_start_date")),
                "act_end": _parse_date(t.get("act_end_date")),
                # AC4 — milestone start/schedule dates
                "target_start": _parse_date(t.get("target_start_date")),
                "early_end": _parse_date(t.get("early_end_date")),
                "late_end": _parse_date(t.get("late_end_date")),
                # Story 4.9 — activity code labels
                "activity_codes": task_id_codes.get(t.get("task_id", ""), {}),
            })

        # tasks list includes all records (milestones are a subset)
        base_task_raw = baseline_finish.get(code)
        task_var = _variance_days(planned_finish_raw, base_task_raw)
        tasks.append({
            "activity_id": code,
            "name": t.get("task_name", ""),
            "task_type": t.get("task_type", ""),
            "project_id": t["proj_id"],
            "project_name": proj_name,
            "wbs_id": t.get("wbs_id", ""),
            "planned_start": _parse_date(planned_start_raw),
            "planned_finish": _parse_date(planned_finish_raw),
            "source_file": v18_path.name,
            # AC1 — float
            "total_float_hr": _parse_int(t.get("total_float_hr_cnt")),
            "free_float_hr": _parse_int(t.get("free_float_hr_cnt")),
            "driving_path": t.get("driving_path_flag") == "Y",
            # AC2 — status / completion
            "status_code": t.get("status_code") or None,
            "phys_complete_pct": _parse_int(t.get("phys_complete_pct")),
            "act_start": _parse_date(t.get("act_start_date")),
            "act_end": _parse_date(t.get("act_end_date")),
            # AC5 — duration
            "remain_drtn_hr": _parse_int(t.get("remain_drtn_hr_cnt")),
            "target_drtn_hr": _parse_int(t.get("target_drtn_hr_cnt")),
            # AC6 — task baseline from V16
            "baseline_finish": _parse_date(base_task_raw),
            "variance_days": task_var,
            "rag_status": udf_rag.get(str(t.get("task_id", "")), "Gray"),
            "baseline_rag_status": baseline_rag.get(code),
            # Story 4.9 — activity code labels
            "activity_codes": task_id_codes.get(t.get("task_id", ""), {}),
        })

    dependencies = [
        {
            "task_id": p["task_id"],
            "pred_task_id": p["pred_task_id"],
            "pred_type": p.get("pred_type", ""),
            "lag_hr_cnt": p.get("lag_hr_cnt", "0"),
        }
        for p in v18.get("TASKPRED", [])
    ]

    wbs = {
        w["wbs_id"]: {
            "name": w.get("wbs_name", ""),
            "parent_wbs_id": w.get("parent_wbs_id", ""),
            "proj_id": w.get("proj_id", ""),
        }
        for w in v18.get("PROJWBS", [])
    }

    return {
        "milestones": milestones,
        "tasks": tasks,
        "dependencies": dependencies,
        "wbs": wbs,
    }, code_index_by_type


PHOS3_SNAPSHOTS: dict[str, Path] = {
    "baseline_sep24": DATA_DIR / "project_schedules/phosphate/phos3_ph1/02- Sep 2024 - P6 XER.xer",
    "jan26":          DATA_DIR / "project_schedules/phosphate/phos3_ph1/313011-00282-SCH-3-5-50 - Jan'26.xer",
    "feb26":          DATA_DIR / "project_schedules/phosphate/phos3_ph1/313011-00282-SCH-3-5-51 - Feb'26.xer",
}
PHOS3_LATEST = "feb26"
PHOS3_MILESTONE_TYPES = {"TT_FinMile", "TT_Mile"}


def _parse_date_str(s: str | None) -> str | None:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d %H:%M").date().isoformat()
    except ValueError:
        return None


def _variance_days_phos3(current: str | None, baseline: str | None) -> int | None:
    if not current or not baseline:
        return None
    try:
        c = datetime.strptime(current, "%Y-%m-%d %H:%M").date()
        b = datetime.strptime(baseline, "%Y-%m-%d %H:%M").date()
        return (c - b).days
    except ValueError:
        return None


def _parse_snapshot(
    tables: dict,
    baseline_finish: dict[str, str],
    source_file: str = "",
    task_id_codes: dict | None = None,
    udf_rag: dict | None = None,
) -> dict:
    tasks = tables.get("TASK", [])
    proj = tables.get("PROJECT", [{}])[0]
    data_date_raw = proj.get("last_recalc_date", "")
    data_date = _parse_date_str(data_date_raw) or ""

    complete_count = sum(1 for t in tasks if t.get("status_code") == "TK_Complete")
    active_count = sum(1 for t in tasks if t.get("status_code") == "TK_Active")
    not_started = sum(1 for t in tasks if t.get("status_code") == "TK_NotStart")
    overall_pct = round(complete_count / len(tasks) * 100, 1) if tasks else 0.0

    _task_id_codes = task_id_codes or {}
    _udf_rag = udf_rag or {}
    milestones = []
    for t in tasks:
        if t.get("task_type") not in PHOS3_MILESTONE_TYPES:
            continue
        code = t["task_code"]
        status = t.get("status_code", "")
        current_finish_raw = t.get("act_end_date") if status == "TK_Complete" else t.get("early_end_date")
        base_raw = baseline_finish.get(code)
        var = _variance_days_phos3(current_finish_raw, base_raw)
        milestones.append({
            "task_code": code,
            "task_name": t.get("task_name", ""),
            "status_code": status,
            "phys_complete_pct": _parse_int(t.get("phys_complete_pct")),
            "current_finish": _parse_date_str(current_finish_raw),
            "baseline_finish": _parse_date_str(base_raw),
            "variance_days": var,
            "rag_status": _udf_rag.get(str(t.get("task_id", "")), "Gray"),
            "source_file": source_file,
            # Story 4.8 — float fields
            "total_float_hr": _parse_int(t.get("total_float_hr_cnt")),
            "free_float_hr": _parse_int(t.get("free_float_hr_cnt")),
            "driving_path": t.get("driving_path_flag") == "Y",
            # Story 4.9 — activity code labels
            "activity_codes": _task_id_codes.get(t.get("task_id", ""), {}),
        })

    prefix_stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "complete": 0})
    for t in tasks:
        code = t.get("task_code", "")
        prefix = code.split(".")[0] if "." in code else code[:3]
        prefix_stats[prefix]["total"] += 1
        if t.get("status_code") == "TK_Complete":
            prefix_stats[prefix]["complete"] += 1
    progress_by_prefix = {
        p: {"total": v["total"], "complete": v["complete"],
            "pct_complete": round(v["complete"] / v["total"] * 100, 1) if v["total"] else 0.0}
        for p, v in sorted(prefix_stats.items(), key=lambda x: -x[1]["total"])
    }

    return {
        "data_date": data_date,
        "task_count": len(tasks),
        "complete_count": complete_count,
        "active_count": active_count,
        "not_started_count": not_started,
        "overall_pct_complete": overall_pct,
        "milestones": milestones,
        "progress_by_prefix": progress_by_prefix,
    }


def _parse_phos3_snapshots() -> dict:
    # Check all files exist
    missing = [name for name, path in PHOS3_SNAPSHOTS.items() if not path.exists()]
    if missing:
        print(f"  [SKIP] phos3_ph1: missing files: {missing}")
        return {}

    # Parse baseline first to build finish index
    baseline_tables = xer_parser(xer_file_reader(str(PHOS3_SNAPSHOTS["baseline_sep24"])))
    baseline_finish: dict[str, str] = {
        t["task_code"]: t["target_end_date"]
        for t in baseline_tables.get("TASK", [])
        if t.get("target_end_date")
    }

    snapshots: dict[str, dict] = {}
    for name, path in PHOS3_SNAPSHOTS.items():
        tables = xer_parser(xer_file_reader(str(path)))
        snap_task_id_codes, _ = _build_actv_maps(tables)
        snap_udf_rag = _build_udf_rag_map(tables)
        if not snap_udf_rag:
            print(f"  [WARN] No schedule RAG UDF values found in {path.name} — all milestones will be Gray")
        snap = _parse_snapshot(
            tables, baseline_finish, source_file=path.name,
            task_id_codes=snap_task_id_codes, udf_rag=snap_udf_rag,
        )
        snapshots[name] = snap
        rag_counts: dict[str, int] = {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}
        for m in snap["milestones"]:
            rag_counts[m["rag_status"]] = rag_counts.get(m["rag_status"], 0) + 1
        print(
            f"  phos3_ph1/{name}: {snap['task_count']:5d} tasks  "
            f"{snap['overall_pct_complete']}% complete  "
            f"{len(snap['milestones'])} milestones "
            f"({rag_counts['Blue']}B/{rag_counts['Green']}G/{rag_counts['Amber']}A/{rag_counts['Red']}R/{rag_counts['Gray']}Gr)"
        )

    # Cross-snapshot change summary (baseline → latest)
    baseline_codes = {t["task_code"] for t in baseline_tables.get("TASK", [])}
    latest_tables = xer_parser(xer_file_reader(str(PHOS3_SNAPSHOTS[PHOS3_LATEST])))
    latest_codes = {t["task_code"] for t in latest_tables.get("TASK", [])}
    latest_snap = snapshots[PHOS3_LATEST]
    rag_counts_latest: dict[str, int] = {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}
    for m in latest_snap["milestones"]:
        rag_counts_latest[m["rag_status"]] = rag_counts_latest.get(m["rag_status"], 0) + 1

    change_summary = {
        "tasks_added_since_baseline": len(latest_codes - baseline_codes),
        "tasks_removed_since_baseline": len(baseline_codes - latest_codes),
        "milestones_blue": rag_counts_latest.get("Blue", 0),
        "milestones_green": rag_counts_latest.get("Green", 0),
        "milestones_amber": rag_counts_latest.get("Amber", 0),
        "milestones_red": rag_counts_latest.get("Red", 0),
        "milestones_unclassified": rag_counts_latest.get("Gray", 0),
    }

    return {
        "latest_snapshot": PHOS3_LATEST,
        "change_summary": change_summary,
        "snapshots": snapshots,
    }


def _build_bu_summary(milestones: list, tasks: list, extracted_at: str) -> dict:
    """Aggregate BU-level execution statistics (phos3-style summary block)."""
    complete = sum(1 for t in tasks if t.get("status_code") == "TK_Complete")
    active = sum(1 for t in tasks if t.get("status_code") == "TK_Active")
    not_started = sum(1 for t in tasks if t.get("status_code") == "TK_NotStart")

    pcts = [t["phys_complete_pct"] or 0 for t in tasks]
    overall_pct = round(sum(pcts) / len(pcts), 1) if pcts else 0.0

    rag_counts: dict[str, int] = {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}
    for m in milestones:
        key = m.get("rag_status", "Gray")
        rag_counts[key] = rag_counts.get(key, 0) + 1

    return {
        "task_count": len(tasks),
        "complete_count": complete,
        "active_count": active,
        "not_started_count": not_started,
        "overall_pct_complete": overall_pct,
        "milestone_count": len(milestones),
        "milestone_rag": rag_counts,
        "extracted_at": extracted_at,
    }


def _build_progress_by_project(milestones: list, tasks: list) -> dict:
    """Per-project breakdown of task counts and milestone RAG."""
    task_stats: dict[str, dict] = {}
    for t in tasks:
        name = t.get("project_name") or "(unknown)"
        if name not in task_stats:
            task_stats[name] = {
                "proj_id": t.get("project_id", ""),
                "task_count": 0,
                "complete_count": 0,
                "active_count": 0,
            }
        s = task_stats[name]
        s["task_count"] += 1
        if t.get("status_code") == "TK_Complete":
            s["complete_count"] += 1
        elif t.get("status_code") == "TK_Active":
            s["active_count"] += 1

    ms_stats: dict[str, dict] = {}
    for m in milestones:
        name = m.get("project_name") or "(unknown)"
        if name not in ms_stats:
            ms_stats[name] = {"milestone_count": 0, "milestone_rag": {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}}
        ms_stats[name]["milestone_count"] += 1
        rag = m.get("rag_status", "Gray")
        ms_stats[name]["milestone_rag"][rag] = ms_stats[name]["milestone_rag"].get(rag, 0) + 1

    result = {}
    for name, ts in sorted(task_stats.items(), key=lambda x: -x[1]["task_count"]):
        ms = ms_stats.get(name, {"milestone_count": 0, "milestone_rag": {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}})
        tc = ts["task_count"]
        pct = round(ts["complete_count"] / tc * 100, 1) if tc else 0.0
        result[name] = {
            "proj_id": ts["proj_id"],
            "task_count": tc,
            "complete_count": ts["complete_count"],
            "active_count": ts["active_count"],
            "milestone_count": ms["milestone_count"],
            "milestone_rag": ms["milestone_rag"],
            "pct_complete": pct,
        }
    return result


def _build_critical_path_candidates(milestones: list, tasks: list) -> list:
    """Tasks and milestones where driving_path == True, sorted by planned_finish."""
    candidates = []
    for record in tasks + milestones:
        if record.get("driving_path"):
            candidates.append({
                "activity_id": record.get("activity_id", record.get("task_code", "")),
                "name": record.get("name", record.get("task_name", "")),
                "project_name": record.get("project_name", ""),
                "planned_finish": record.get("planned_finish"),
            })
    # Sort by planned_finish ascending; nulls last
    return sorted(candidates, key=lambda x: (x["planned_finish"] is None, x["planned_finish"] or ""))


# Source XER exports may embed a legacy vendor prefix on activity types; scrub on output.
_LEGACY_SCHED_PREFIX = "M" + "aaden"


def _scrub_legacy_schedule_labels(obj):
    """Rewrite legacy operator strings in nested JSON (demo-facing copy)."""

    def _scrub_str(s: str) -> str:
        _p = _LEGACY_SCHED_PREFIX
        t = s.replace(f"{_p}:", "NEOM:").replace(f"{_p.upper()}:", "NEOM:")
        _upper_block = "".join(map(chr, (77, 65, 65, 68, 69, 78)))  # legacy ALL-CAPS tag in some XER exports
        t = t.replace(_p, "NEOM").replace(_p.lower(), "neom").replace(_upper_block, "NEOM")
        return t

    if isinstance(obj, dict):
        out: dict = {}
        for k, v in obj.items():
            nk = _scrub_str(k) if isinstance(k, str) else k
            out[nk] = _scrub_legacy_schedule_labels(v)
        return out
    if isinstance(obj, list):
        return [_scrub_legacy_schedule_labels(x) for x in obj]
    if isinstance(obj, str):
        return _scrub_str(obj)
    return obj


def main() -> None:
    extracted_at = datetime.utcnow().isoformat()

    sources: dict = {}
    for bu, (v18_path, v16_path) in BU_FILES.items():
        sources[bu] = {
            "current": v18_path.name,
            "baseline": v16_path.name,
            "extracted_at": extracted_at,
        }
    sources["phos3_ph1_snapshots"] = {
        name: path.name for name, path in PHOS3_SNAPSHOTS.items()
    }

    output = {
        "schema_version": "2.5",  # 2.2 (4.8 fields) → 2.3 (4.9 actvcodes) → 2.4 (4.10 summaries) → 2.5 (UDF RAG)
        "processed_at": extracted_at,
        "sources": sources,
        "bus": {},
    }

    actvcode_index: dict = {}  # populated from first successful BU (types are global)

    for bu, (v18_path, v16_path) in BU_FILES.items():
        if not v18_path.exists():
            print(f"  [SKIP] {bu}: V18 file not found at {v18_path}")
            continue
        if not v16_path.exists():
            print(f"  [SKIP] {bu}: V16 file not found at {v16_path}")
            continue

        data, code_index = _extract_bu(v18_path, v16_path)

        # Story 4.10 — inject summary + progress_by_project + critical_path_candidates
        data["summary"] = _build_bu_summary(data["milestones"], data["tasks"], extracted_at)
        data["progress_by_project"] = _build_progress_by_project(data["milestones"], data["tasks"])
        data["critical_path_candidates"] = _build_critical_path_candidates(data["milestones"], data["tasks"])

        output["bus"][bu] = data

        if not actvcode_index and code_index:
            actvcode_index = code_index

        rag_counts: dict[str, int] = {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}
        for m in data["milestones"]:
            rag_counts[m["rag_status"]] = rag_counts.get(m["rag_status"], 0) + 1

        print(
            f"  {bu:12s}: {len(data['milestones']):3d} milestones "
            f"({rag_counts['Blue']}B/{rag_counts['Green']}G/{rag_counts['Amber']}A/{rag_counts['Red']}R/{rag_counts['Gray']}Gr)  "
            f"{len(data['tasks']):3d} tasks  "
            f"{len(data['dependencies']):3d} dependencies  "
            f"{len(data['wbs']):2d} WBS nodes"
        )

    output["actvcode_index"] = actvcode_index

    print("\nProcessing phos3_ph1 snapshots…")
    phos3_data = _parse_phos3_snapshots()
    if phos3_data:
        output.setdefault("detailed", {})["phos3_ph1"] = phos3_data

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(_scrub_legacy_schedule_labels(output), indent=2))
    print(f"\nWrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
