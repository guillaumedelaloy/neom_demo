"""Chart generation tool for the NEOM AI copilot.

Returns chart specifications that are emitted to the frontend as SSE events.
The frontend renders charts using recharts (already installed).
"""

from typing import Any

CHART_TYPES = ("bar", "line", "pie")


def generate_chart(
    chart_type: str,
    title: str,
    data: list[dict[str, Any]],
    x_key: str,
    y_keys: list[str],
    x_label: str = "",
    y_label: str = "",
) -> dict[str, Any]:
    """Validate and return a chart spec.

    The agent loop detects ``chart_spec`` in the result and emits it as an SSE
    ``chart`` event to the frontend.  The confirmation string is returned to the
    LLM so it can narrate around the chart.
    """
    if chart_type not in CHART_TYPES:
        return {"error": f"Unsupported chart type '{chart_type}'. Use: {', '.join(CHART_TYPES)}"}
    if not data or not isinstance(data, list):
        return {"error": "data must be a non-empty list of objects"}
    if not y_keys:
        return {"error": "y_keys must contain at least one key"}

    spec: dict[str, Any] = {
        "type": chart_type,
        "title": title,
        "data": data,
        "xKey": x_key,
        "yKeys": y_keys,
    }
    if x_label:
        spec["xLabel"] = x_label
    if y_label:
        spec["yLabel"] = y_label

    return {
        "chart_spec": spec,
        "confirmation": f"Chart rendered: {chart_type} chart — {title}",
    }


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "generate_chart",
            "description": (
                "Generate a chart to visualize data in the chat response. Use when the user "
                "asks for a visual, trend, comparison, or when data would be clearer as a graph. "
                "Supported types: bar (comparisons), line (trends over time), pie (composition). "
                "The chart appears inline in the user's chat readout. Always use data obtained "
                "from other tools — do not fabricate numbers."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "line", "pie"],
                        "description": "Chart type. bar = comparisons, line = time series, pie = proportions.",
                    },
                    "title": {
                        "type": "string",
                        "description": "Short descriptive title for the chart.",
                    },
                    "data": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": (
                            "Array of data objects. Each object must have the x_key field and all "
                            "y_keys fields. Example: [{\"year\": \"2025\", \"revenue\": 12.5}, ...]"
                        ),
                    },
                    "x_key": {
                        "type": "string",
                        "description": "Key in each data object for the X axis (or category name for pie).",
                    },
                    "y_keys": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Key(s) in each data object for Y axis values (or value for pie).",
                    },
                    "x_label": {
                        "type": "string",
                        "description": "Optional X axis label.",
                    },
                    "y_label": {
                        "type": "string",
                        "description": "Optional Y axis label.",
                    },
                },
                "required": ["chart_type", "title", "data", "x_key", "y_keys"],
            },
        },
    },
]
