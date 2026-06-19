import builtins
import io
import contextlib

import numpy as np
np.set_printoptions(legacy="1.25")  # prevents RuntimeError in exec'd code printing np arrays
import pandas as pd

from api.services.excel_loader import loader, find_data_start

# Remove __import__ and open so exec'd code cannot import arbitrary modules or read files.
# Keeping all other builtins so print(), range(), len(), etc. remain available.
_SAFE_BUILTINS = {k: v for k, v in vars(builtins).items() if k not in ("__import__", "open")}

EXEC_ENV: dict = {
    "__builtins__": _SAFE_BUILTINS,
    "sheets": loader,
    "find_data_start": find_data_start,
    "pd": pd,
    "np": np,
}


def list_sheets() -> str:
    if loader is None:
        return "Excel file not available"
    dims = loader.dimensions()
    return "\n".join(f'"{name}" — {r}r × {c}c' for name, (r, c) in dims.items())


def preview_sheet(sheet_name: str, n_rows: int = 15) -> str:
    if loader is None:
        return "Excel file not available"
    df = find_data_start(loader[sheet_name])
    return df.head(n_rows).to_string(index=True)


def preview_sheets(sheet_names: list[str], n_rows: int = 15) -> str:
    if loader is None:
        return "Excel file not available"
    parts = []
    for name in sheet_names:
        try:
            df = find_data_start(loader[name])
            parts.append(f"=== {name} ===\n{df.head(n_rows).to_string(index=True)}")
        except Exception:
            parts.append(f"=== {name} ===\nSheet '{name}' not found")
    result = "\n\n".join(parts)
    return result[:6000]


def get_sheet_labels(sheet_name: str) -> str:
    if loader is None:
        return "Excel file not available"
    try:
        df = loader[sheet_name]
    except Exception:
        return f"Sheet '{sheet_name}' not found"
    hits = []
    for r in range(len(df)):
        for c in range(len(df.columns)):
            val = df.iat[r, c]
            if isinstance(val, str) and val.strip():
                hits.append(f"row {r}, col {c}: {repr(val)}")
    if not hits:
        return f"No string cells found in '{sheet_name}'"
    return "\n".join(hits)[:6000]


def describe_workbook() -> str:
    if loader is None or not loader.index:
        return "Workbook index not available — run build_workbook_index.py"
    idx = loader.index
    meta = idx.get("meta", {})
    bu_aliases: dict = idx.get("bu_aliases", {})
    all_sheets: dict = idx.get("sheets", {})

    lines = [
        f"WORKBOOK: {meta.get('source', 'unknown')} — "
        f"{meta.get('total_sheets', 0)} sheets total"
    ]

    # Sector / consolidate sheet alias map (internal workbook labels)
    lines.append("\nSECTOR SHEET ALIASES (use these sheet names for financial queries):")
    for alias, sheet in bu_aliases.items():
        lines.append(f"  {alias} → {sheet}")

    # Key sheets: name + dims + year range (lightweight — use preview_sheet to see values)
    priority_names = set(bu_aliases.values())
    lines.append("\nKEY SHEETS (dims + year range — call preview_sheet to see actual values):")
    for name in priority_names:
        info = all_sheets.get(name)
        if not info:
            continue
        r, c = info["dims"]
        year_cols = info.get("year_cols", {})
        yr_range = ""
        if year_cols:
            yrs = sorted(year_cols.keys())
            yr_range = f", years {yrs[0]}–{yrs[-1]}"
        lines.append(f"  {name}: {r}r × {c}c{yr_range}")

    # All other sheets: name + dims + top 5 text tokens
    lines.append("\nALL OTHER SHEETS (name, dims, top labels):")
    for name, info in all_sheets.items():
        if name in priority_names:
            continue
        r, c = info["dims"]
        tokens = info.get("text_tokens", [])
        token_str = (", ".join(tokens[:10])) if tokens else ""
        suffix = f" — {token_str}" if token_str else ""
        lines.append(f"  {name}: {r}r × {c}c{suffix}")

    result = "\n".join(lines)
    if len(result) > 8000:
        result = result[:7900] + "\n[truncated — index exceeds output cap]"
    return result


def run_python(code: str) -> str:
    if loader is None:
        return "Excel file not available — cannot execute code"
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(code, EXEC_ENV)  # noqa: S102
    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"
    return buf.getvalue()[:10000]


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "describe_workbook",
            "description": (
                "Returns a compact overview of the financial workbook: sector sheet alias map, all sheet "
                "names with dimensions and year ranges, and top labels for each sheet. Use this "
                "to identify which sheet to preview — then call preview_sheet to see actual values."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_sheets",
            "description": (
                "Lists all sheet names with row/column dimensions. Use when the data catalogue "
                "doesn't name the sheet you need, or to confirm a sheet exists before previewing."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "preview_sheet",
            "description": (
                "Shows the first N rows of an Excel sheet as a formatted table (default 30 rows). "
                "Call this after describe_workbook to see actual values and structure before "
                "writing run_python code. Returns sheet_name, row count, and the table."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sheet_name": {
                        "type": "string",
                        "description": "Name of the sheet to preview.",
                    },
                    "n_rows": {
                        "type": "integer",
                        "description": "Number of rows to return (default 30).",
                    },
                },
                "required": ["sheet_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "preview_sheets",
            "description": (
                "Preview multiple sheets in one call. Pass a list of sheet names. Use when a "
                "question spans multiple sheets — avoids one round-trip per sheet."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sheet_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of sheet names to preview.",
                    },
                    "n_rows": {
                        "type": "integer",
                        "description": "Number of rows per sheet (default 20).",
                    },
                },
                "required": ["sheet_names"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_python",
            "description": (
                "Executes pandas Python code against the Excel financial model. "
                "In scope: sheets['Sheet Name'] → DataFrame, find_data_start(df), pd, np. "
                "Use print() for output — stdout is returned (capped at 10000 chars). "
                "Always call preview_sheet first to see actual values and structure."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute. Use print() for all output.",
                    }
                },
                "required": ["code"],
            },
        },
    },
]
