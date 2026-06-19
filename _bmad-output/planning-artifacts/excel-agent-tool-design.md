# Excel Agent Tool Design — Financial Model Access Layer

## Problem Statement

The financial model (`v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx`) has ~140 sheets, is 15MB, and is structurally messy:
- Data does not consistently start at row 1 / column A (leading blank rows and columns are common)
- Sheet structure varies — headers in non-standard positions, merged cells, spacer rows
- Only 3–5 sheets are relevant to any given agent query

The goal is to give an agent **unrestricted read access** to any part of the Excel, while keeping startup fast, context clean, and leaving all data interpretation to the agent.

---

## Design Principles

1. **Don't pre-process or normalize** — messy structure is the agent's problem to handle, not the ingestion pipeline's
2. **Lazy load** — only read sheets from disk when the agent requests them
3. **No schema assumptions** — always load with `header=None`; let the agent discover structure
4. **Context hygiene** — nothing about the 140 sheets goes in the system prompt; the agent navigates via tools

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Agent (LLM)                                                 │
│                                                              │
│  Step 1: list_sheets()      → 140 names + dimensions        │
│  Step 2: preview_sheet()    → first 15 rows of candidate    │
│  Step 3: run_python(code)   → targeted extraction           │
└────────────────┬─────────────────────────────────────────────┘
                 │ tool calls
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  Tool Layer                                                  │
│                                                              │
│  list_sheets()              Fast — reads metadata only       │
│  preview_sheet(name, n)     Loads one sheet on demand        │
│  run_python(code)           Executes pandas in sandboxed env │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  LazyExcelLoader                                             │
│                                                              │
│  - Opens ExcelFile handle at startup (no data read)         │
│  - Parses individual sheets on first access                  │
│  - Caches loaded sheets in memory                            │
│  - All sheets loaded with header=None                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. LazyExcelLoader

```python
import pandas as pd

class LazyExcelLoader:
    def __init__(self, path: str):
        self.path = path
        self._cache: dict[str, pd.DataFrame] = {}
        self._xl = pd.ExcelFile(path, engine="openpyxl")  # metadata only

    def sheet_names(self) -> list[str]:
        return self._xl.sheet_names  # instant, no data read

    def dimensions(self) -> dict[str, tuple[int, int]]:
        """Returns {sheet_name: (n_rows, n_cols)} without loading data."""
        dims = {}
        for name in self._xl.sheet_names:
            ws = self._xl.book[name]
            dims[name] = (ws.max_row, ws.max_column)
        return dims

    def __getitem__(self, name: str) -> pd.DataFrame:
        if name not in self._cache:
            self._cache[name] = self._xl.parse(name, header=None)
        return self._cache[name]  # loaded once, cached for session
```

**Notes:**
- Instantiate once at application startup, pass into the tool layer
- `pd.ExcelFile` opens the ZIP archive but does not parse sheet data
- `header=None` is mandatory — do not let pandas guess headers

---

### 2. find_data_start Helper

Handles sheets where data does not start at row 0 / column 0.

```python
def find_data_start(df: pd.DataFrame) -> pd.DataFrame:
    """Crop leading empty rows and columns, reset index to 0."""
    row_start = int(df.notna().any(axis=1).idxmax())
    col_start = int(df.notna().any(axis=0).idxmax())
    return df.iloc[row_start:, col_start:].reset_index(drop=True)
```

This is a utility made available inside the `run_python` execution environment so the agent can call it without reimplementing it.

---

### 3. Tool Definitions

#### `list_sheets() -> str`

Returns all sheet names and their dimensions as a formatted string. No sheets are loaded from disk.

```python
def list_sheets() -> str:
    dims = loader.dimensions()
    lines = [f"{name} — {r}r × {c}c" for name, (r, c) in dims.items()]
    return "\n".join(lines)
```

**Agent use:** Called once at the start of any Excel-related query to identify candidate sheets.

---

#### `preview_sheet(sheet_name: str, n_rows: int = 15) -> str`

Loads one sheet and returns the first `n_rows` as a plain-text table. Applies `find_data_start` automatically.

```python
def preview_sheet(sheet_name: str, n_rows: int = 15) -> str:
    df = loader[sheet_name]
    df = find_data_start(df)
    return df.head(n_rows).to_string(index=True)
```

**Agent use:** Called after `list_sheets()` to understand the structure of a candidate sheet before writing extraction code. Typically called on 1–3 sheets per query.

---

#### `run_python(code: str) -> str`

Executes arbitrary Python code in a sandboxed environment. Returns stdout (capped at ~4,000 characters).

```python
import io
import contextlib

def run_python(code: str) -> str:
    stdout_capture = io.StringIO()
    try:
        with contextlib.redirect_stdout(stdout_capture):
            exec(code, EXEC_ENV)  # see Execution Environment below
    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"
    output = stdout_capture.getvalue()
    return output[:4000] if len(output) > 4000 else output
```

**Agent use:** Called to perform actual extraction, filtering, aggregation, or any transformation after the agent has understood sheet structure via `preview_sheet`.

---

### 4. Execution Environment

The dict passed as `globals` to `exec` inside `run_python`:

```python
EXEC_ENV = {
    # Data access
    "sheets":            loader,           # sheets['Sheet Name'] → DataFrame
    # Utilities
    "find_data_start":   find_data_start,  # offset helper
    # Safe libraries
    "pd":                pd,
    "np":                np,
    # Explicitly excluded: os, open, requests, subprocess, importlib
}
```

Do not expose file I/O, network, or import mechanisms. The agent should only be able to read the Excel data.

---

## Agent Flow

### System Prompt Instruction (excerpt)

```
You have access to a financial model Excel file with ~140 sheets.

To answer questions about the financial data, use these tools in order:

1. list_sheets() — get all sheet names and sizes. Identify candidates.
2. preview_sheet(name) — examine the raw structure of a candidate sheet.
   Use this before writing any extraction code.
3. run_python(code) — execute pandas code to extract and process data.
   Inside code, use:
     sheets['Sheet Name']   to load a sheet as a raw DataFrame
     find_data_start(df)    to remove leading blank rows/columns

Always preview before running extraction code. Sheets do not have consistent
header positions — never assume data starts at row 0 or column 0.
```

---

### Example Agent Turn

**User:** What is the projected revenue for 2028 and 2030?

```
Agent → list_sheets()
← "Consolidated Group — 360r × 31c ..."

Agent → preview_sheet("Consolidated Group")
← [raw first 15 rows showing years in row 3, labels in col 1]

Agent → run_python("""
df = find_data_start(sheets['Consolidated Group'])
# From preview: years are in row 3 (index 3 after crop), labels in col 0
year_row = df.iloc[3].tolist()
data = df.iloc[4:].copy()
data.columns = range(len(data.columns))
revenue_row = data[data.iloc[:, 0] == 'Revenue']
# Map year positions
col_2028 = year_row.index(2028)
col_2030 = year_row.index(2030)
print(f"Revenue 2028: {revenue_row.iloc[0, col_2028]:,.0f} SAR millions")
print(f"Revenue 2030: {revenue_row.iloc[0, col_2030]:,.0f} SAR millions")
""")
← "Revenue 2028: 50,815 SAR millions
   Revenue 2030: 80,793 SAR millions"
```

---

## Output Cap and Pagination

`run_python` output is capped at 4,000 characters. If the agent needs more:

- It should filter/aggregate before printing (`.head()`, `.loc[]`, specific columns)
- For large extractions, print in chunks across multiple `run_python` calls
- Do not dump entire DataFrames — the agent should always extract the specific rows/columns it needs

---

## File Location

```
data_extract/strategy/financial_model/
  v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx   ← source file
```

The loader should be initialised with the absolute path to this file.

---

## Implementation Notes

- The loader should be a **module-level singleton** — instantiated once when the API route or server starts, not per request
- Sheet caching is in-memory for the session lifetime; no persistence needed
- `openpyxl` is required (`engine="openpyxl"`); `xlrd` does not support `.xlsx`
- For the demo, the `run_python` sandbox does not need a full subprocess isolate — `exec` with a restricted `EXEC_ENV` dict is sufficient
- If extending to production, replace `exec` with a subprocess-based executor (e.g. `RestrictedPython` or a Docker sidecar)
