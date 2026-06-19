from __future__ import annotations

from api.services.data_cache import get_phos3

_NOT_LOADED = {
    "error": "Urban Development flagship Phase 1 schedule data not loaded. Run scripts/process_schedule_data.py first."
}

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_phos3_summary",
            "description": (
                "Summary of Urban Development flagship Phase 1 execution schedule: task count, "
                "% complete, milestone RAG breakdown, and data date. "
                "Always call this first for any question about that programme's execution or delivery status."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "snapshot": {
                        "type": "string",
                        "enum": ["latest", "baseline_sep24", "jan26", "feb26"],
                        "description": "Which snapshot to read. Defaults to 'latest' (feb26).",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_phos3_milestones",
            "description": (
                "Milestones from Urban Development flagship Phase 1 execution schedule with RAG status, "
                "variance vs Sep 2024 baseline, and forecast/actual finish dates. "
                "Cap: 100 milestones. Use rag_filter to focus on delayed items."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "snapshot": {
                        "type": "string",
                        "enum": ["latest", "baseline_sep24", "jan26", "feb26"],
                        "description": "Which snapshot to read. Defaults to 'latest' (feb26).",
                    },
                    "rag_filter": {
                        "type": "string",
                        "enum": ["Red", "Amber", "Green", "Gray", "all"],
                        "description": "Filter by RAG status. Defaults to 'all'. Gray = no NEOM RAG indicator assigned (these contractor schedules omit the field — all milestones will be Gray).",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max milestones to return (1–100). Defaults to 100.",
                        "minimum": 1,
                        "maximum": 100,
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_phos3_changes",
            "description": (
                "Change summary for Urban Development flagship Phase 1 execution: tasks added/removed since Sep 2024 baseline, "
                "milestone RAG breakdown in the latest snapshot. "
                "Use for snapshot comparison or scope change questions."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def _resolve_snapshot(data: dict, snapshot: str) -> dict | None:
    key = data.get("latest_snapshot", "feb26") if snapshot == "latest" else snapshot
    return data.get("snapshots", {}).get(key)


def get_phos3_summary(snapshot: str = "latest") -> dict:
    data = get_phos3()
    if not data:
        return _NOT_LOADED
    snap = _resolve_snapshot(data, snapshot)
    if snap is None:
        return {"error": f"Snapshot '{snapshot}' not found."}
    rag: dict[str, int] = {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}
    for m in snap.get("milestones", []):
        status = m.get("rag_status", "Gray")
        rag[status] = rag.get(status, 0) + 1
    return {
        "snapshot": snapshot,
        "data_date": snap.get("data_date"),
        "task_count": snap.get("task_count"),
        "complete_count": snap.get("complete_count"),
        "active_count": snap.get("active_count"),
        "not_started_count": snap.get("not_started_count"),
        "overall_pct_complete": snap.get("overall_pct_complete"),
        "milestone_rag_summary": rag,
        "progress_by_prefix": snap.get("progress_by_prefix", {}),
    }


def get_phos3_milestones(
    snapshot: str = "latest",
    rag_filter: str = "all",
    limit: int = 100,
) -> dict:
    data = get_phos3()
    if not data:
        return _NOT_LOADED
    snap = _resolve_snapshot(data, snapshot)
    if snap is None:
        return {"error": f"Snapshot '{snapshot}' not found."}
    milestones = snap.get("milestones", [])
    if rag_filter and rag_filter != "all":
        milestones = [m for m in milestones if m.get("rag_status") == rag_filter]
    limit = min(max(1, int(limit)), 100)
    return {
        "snapshot": snapshot,
        "rag_filter": rag_filter,
        "total_matching": len(milestones),
        "milestones": milestones[:limit],
    }


def get_phos3_changes() -> dict:
    data = get_phos3()
    if not data:
        return _NOT_LOADED
    return {
        "latest_snapshot": data.get("latest_snapshot"),
        "change_summary": data.get("change_summary", {}),
    }
