from __future__ import annotations

from api.services.data_cache import get_schedules

# Internal keys in schedules.json still use legacy mining-era bundle names.
_LEGACY_TO_INTERNAL = {"hospitality": "gold"}
_VALID_INTERNAL = frozenset({"phosphate", "aluminum", "gold", "copper", "ree"})
VALID_BUS_API = frozenset({"phosphate", "aluminum", "hospitality", "copper", "ree"})


def _normalize_bu_code(bu_code: str) -> str:
    b = bu_code.strip().lower()
    return _LEGACY_TO_INTERNAL.get(b, b)


def _public_bu_key(internal: str) -> str:
    if internal == "gold":
        return "hospitality"
    return internal

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_schedule_overview",
            "description": (
                "Cross-BU schedule health: milestone counts by RAG status per BU. "
                "Use for portfolio-level schedule risk questions."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_bu_schedule",
            "description": (
                "RAG status breakdown, milestones, and flagged tasks for one BU. "
                "rag_summary counts ALL tasks (milestones are a subset). "
                "When rag_filter is set, returns matching milestones AND non-milestone flagged_tasks separately. "
                "Use for questions about a specific BU's project schedule or delays."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "bu_code": {
                        "type": "string",
                        "enum": ["phosphate", "aluminum", "hospitality", "copper", "ree"],
                        "description": "Sector schedule bundle (lowercase). Use `hospitality` for Luxury Tourism & Hospitality.",
                    },
                    "rag_filter": {
                        "type": "string",
                        "enum": ["Red", "Amber", "Green", "Blue", "Gray", "all"],
                        "description": "Filter milestones by RAG status. Defaults to 'all'. Blue = Completed, Green = In Progress On Track, Amber = Minor Delay with Mitigation, Red = Major Delay no Mitigation, Gray = Not Started.",
                    },
                },
                "required": ["bu_code"],
            },
        },
    },
]


def get_schedule_overview() -> dict:
    bus_data = get_schedules().get("bus", {})
    if not bus_data:
        return {"error": "Schedule data not loaded. Run scripts/process_schedule_data.py first."}
    overview = {}
    for bu, data in bus_data.items():
        rag: dict[str, int] = {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}
        for t in data.get("tasks", []):
            rag[t.get("rag_status", "Gray")] = rag.get(t.get("rag_status", "Gray"), 0) + 1
        pub = _public_bu_key(bu)
        overview[pub] = {"total_milestones": len(data.get("milestones", [])), "rag_summary": rag, "total_tasks": len(data.get("tasks", []))}
    return {"schedule_overview": overview}


def get_bu_schedule(bu_code: str, rag_filter: str = "all") -> dict:
    raw = bu_code.strip().lower()
    if raw not in VALID_BUS_API:
        return {"error": f"Unknown BU: {bu_code}. Valid options: {sorted(VALID_BUS_API)}"}
    internal = _normalize_bu_code(raw)
    if internal not in _VALID_INTERNAL:
        return {"error": f"Unknown BU: {bu_code}. Valid options: {sorted(VALID_BUS_API)}"}
    data = get_schedules().get("bus", {}).get(internal)
    if data is None:
        return {"error": f"No schedule data for {bu_code}. Run scripts/process_schedule_data.py first."}
    all_tasks = data.get("tasks", [])
    milestones = data.get("milestones", [])

    # RAG summary counts across ALL tasks (milestones are a subset of tasks)
    rag: dict[str, int] = {"Blue": 0, "Green": 0, "Amber": 0, "Red": 0, "Gray": 0}
    for t in all_tasks:
        rag[t.get("rag_status", "Gray")] = rag.get(t.get("rag_status", "Gray"), 0) + 1

    milestone_ids = {m["activity_id"] for m in milestones}
    if rag_filter and rag_filter != "all":
        milestones = [m for m in milestones if m.get("rag_status") == rag_filter]
        # Non-milestone tasks matching the filter — surfaced separately so the agent sees all flagged activities
        flagged_tasks = [
            t for t in all_tasks
            if t.get("rag_status") == rag_filter and t.get("activity_id") not in milestone_ids
        ]
    else:
        flagged_tasks = []

    result = {
        "bu_code": raw,
        "rag_summary": rag,
        "milestones": milestones,
        "total_tasks": len(all_tasks),
        "total_dependencies": len(data.get("dependencies", [])),
    }
    if flagged_tasks:
        result["flagged_tasks"] = flagged_tasks
    return result


