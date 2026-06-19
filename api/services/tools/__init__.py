from api.services.tools import rag_tools
from api.services.tools.schedule_tools import (
    TOOL_SCHEMAS as _SCHEDULE_SCHEMAS,
    get_schedule_overview,
    get_bu_schedule,
)
from api.services.tools.excel_tools import (
    TOOL_SCHEMAS as _EXCEL_SCHEMAS,
    describe_workbook,
    list_sheets,
    preview_sheet,
    preview_sheets,
    run_python,
)
from api.services.tools.phos3_tools import (
    TOOL_SCHEMAS as _PHOS3_SCHEMAS,
    get_phos3_summary,
    get_phos3_milestones,
    get_phos3_changes,
)
from api.services.tools.arithmetic_tools import (
    TOOL_SCHEMAS as _ARITHMETIC_SCHEMAS,
    calculate,
)
from api.services.tools.chart_tools import (
    TOOL_SCHEMAS as _CHART_SCHEMAS,
    generate_chart,
)

TOOL_SCHEMAS = (
    rag_tools.TOOL_SCHEMAS
    + _SCHEDULE_SCHEMAS
    + _EXCEL_SCHEMAS
    + _PHOS3_SCHEMAS
    + _ARITHMETIC_SCHEMAS
    + _CHART_SCHEMAS
)

TOOL_REGISTRY = {
    "search_documents": rag_tools.search_documents,
    "get_schedule_overview": get_schedule_overview,
    "get_bu_schedule": get_bu_schedule,
    "describe_workbook": describe_workbook,
    "list_sheets": list_sheets,
    "preview_sheet": preview_sheet,
    "preview_sheets": preview_sheets,
    "run_python": run_python,
    "get_phos3_summary": get_phos3_summary,
    "get_phos3_milestones": get_phos3_milestones,
    "get_phos3_changes": get_phos3_changes,
    "calculate": calculate,
    "generate_chart": generate_chart,
}
