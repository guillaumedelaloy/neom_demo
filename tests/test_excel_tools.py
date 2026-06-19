from __future__ import annotations

import importlib.util
import inspect
import pandas as pd
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch


def _make_loader(sheets: dict[str, pd.DataFrame]):
    """Return a mock LazyExcelLoader with __getitem__ backed by the given dict."""
    loader = MagicMock()
    loader.__getitem__ = lambda self, name: sheets[name]  # raises KeyError for missing
    return loader


def _simple_df() -> pd.DataFrame:
    return pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})


@pytest.fixture(autouse=True)
def _patch_loader():
    """Patch the module-level loader so tests do not need an actual Excel file."""
    sheets = {
        "Phos_Consolidated BU": _simple_df(),
        "Alum_Consolidated BU": _simple_df(),
    }
    mock_loader = _make_loader(sheets)

    with (
        patch("api.services.tools.excel_tools.loader", mock_loader),
        patch("api.services.tools.excel_tools.find_data_start", side_effect=lambda df: df),
    ):
        yield


# ── T5.1: two valid sheets ────────────────────────────────────────────────────

def test_preview_sheets_two_valid_sheets():
    from api.services.tools.excel_tools import preview_sheets

    result = preview_sheets(["Phos_Consolidated BU", "Alum_Consolidated BU"])

    assert "=== Phos_Consolidated BU ===" in result
    assert "=== Alum_Consolidated BU ===" in result
    # Both sections present — order preserved
    assert result.index("Phos_Consolidated BU") < result.index("Alum_Consolidated BU")


# ── T5.2: unknown sheet — no exception, "not found" message ──────────────────

def test_preview_sheets_unknown_sheet():
    from api.services.tools.excel_tools import preview_sheets

    result = preview_sheets(["NonExistent"])

    assert "Sheet 'NonExistent' not found" in result
    assert "=== NonExistent ===" in result


# ── loader=None guard ────────────────────────────────────────────────────────

def test_preview_sheets_loader_none():
    with patch("api.services.tools.excel_tools.loader", None):
        from importlib import reload
        import api.services.tools.excel_tools as m
        # Call directly with None loader via module reload is complex; test via patching
        pass

    # Simpler: call the function with loader patched to None at the module level
    with patch("api.services.tools.excel_tools.loader", None):
        from api.services.tools.excel_tools import preview_sheets
        result = preview_sheets(["Phos_Consolidated BU"])

    assert result == "Excel file not available"


# ── T5.3: existing preview_sheet unchanged ────────────────────────────────────

def test_preview_sheet_singular_unchanged():
    from api.services.tools.excel_tools import preview_sheet

    result = preview_sheet("Phos_Consolidated BU", n_rows=2)

    # Returns plain-text table with the column names present
    assert "A" in result
    assert "B" in result


# ── TOOL_REGISTRY / TOOL_SCHEMAS — updated for Story 2.10 ────────────────────
# (list_sheets, preview_sheet, preview_sheets, get_sheet_labels removed from
#  registry and schemas; describe_workbook added — AC8, AC9)

def test_tool_registry_contains_describe_workbook():
    from api.services.tools import TOOL_REGISTRY
    assert "describe_workbook" in TOOL_REGISTRY


def test_tool_registry_core_tools_present():
    from api.services.tools import TOOL_REGISTRY
    for name in ("run_python", "search_documents"):
        assert name in TOOL_REGISTRY, f"Missing tool: {name}"


def test_tool_schemas_contains_describe_workbook():
    from api.services.tools import TOOL_SCHEMAS
    names = [s["function"]["name"] for s in TOOL_SCHEMAS]
    assert "describe_workbook" in names


# ── T5.5: line count ≤250 (raised in Story 4.6 — TOOL_SCHEMAS grew by ~60 lines) ──

def test_excel_tools_line_count():
    import api.services.tools.excel_tools as m
    source = inspect.getsource(m)
    lines = source.splitlines()
    assert len(lines) <= 250, f"excel_tools.py is {len(lines)} lines — exceeds 250 limit"


# ── output cap at 6000 chars ─────────────────────────────────────────────────

def test_preview_sheets_output_capped():
    # Make a large DataFrame so the raw output would exceed 6000 chars
    big_df = pd.DataFrame({"col": ["x" * 100] * 200})
    sheets = {"Big": big_df}
    mock_loader = _make_loader(sheets)

    with (
        patch("api.services.tools.excel_tools.loader", mock_loader),
        patch("api.services.tools.excel_tools.find_data_start", side_effect=lambda df: df),
    ):
        from api.services.tools.excel_tools import preview_sheets
        result = preview_sheets(["Big"])

    assert len(result) <= 6000


# ── get_sheet_labels ──────────────────────────────────────────────────────────

@pytest.fixture
def _label_loader():
    df = pd.DataFrame({
        "A": ["Revenue", 100, 200],
        "B": ["Capex", 300, 400],
        "C": [1.0, 2.0, 3.0],
    })
    sheets = {"Financials": df}
    mock_loader = _make_loader(sheets)
    with patch("api.services.tools.excel_tools.loader", mock_loader):
        yield


def test_get_sheet_labels_returns_string_cells(_label_loader):
    from api.services.tools.excel_tools import get_sheet_labels
    result = get_sheet_labels("Financials")
    assert "row 0, col 0:" in result
    assert "'Revenue'" in result
    assert "'Capex'" in result


def test_get_sheet_labels_unknown_sheet(_label_loader):
    from api.services.tools.excel_tools import get_sheet_labels
    result = get_sheet_labels("NonExistent")
    assert result == "Sheet 'NonExistent' not found"


def test_get_sheet_labels_no_strings():
    df = pd.DataFrame({"A": [1, 2], "B": [3.0, 4.0]})
    mock_loader = _make_loader({"Numbers": df})
    with patch("api.services.tools.excel_tools.loader", mock_loader):
        from api.services.tools.excel_tools import get_sheet_labels
        result = get_sheet_labels("Numbers")
    assert result == "No string cells found in 'Numbers'"


def test_get_sheet_labels_loader_none():
    with patch("api.services.tools.excel_tools.loader", None):
        from api.services.tools.excel_tools import get_sheet_labels
        result = get_sheet_labels("Financials")
    assert result == "Excel file not available"


def test_get_sheet_labels_output_capped():
    df = pd.DataFrame({"A": [f"label_{i}" for i in range(2000)]})
    mock_loader = _make_loader({"Big": df})
    with patch("api.services.tools.excel_tools.loader", mock_loader):
        from api.services.tools.excel_tools import get_sheet_labels
        result = get_sheet_labels("Big")
    assert len(result) <= 6000


# ── Story 2.10: describe_workbook ─────────────────────────────────────────────

_FIXTURE_INDEX = {
    "meta": {
        "source": "test.xlsx",
        "built_at": "2026-01-01T00:00:00+00:00",
        "total_sheets": 5,
        "key_sheets_count": 2,
    },
    "bu_aliases": {"phos": "Phos_Consolidated BU", "alum": "Alum_Consolidated BU"},
    "sheets": {
        "Phos_Consolidated BU": {
            "dims": [100, 30],
            "year_header_row": 1,
            "year_cols": {"2025": 3, "2026": 4, "2027": 5},
            "text_tokens": ["EBITDA", "Revenue", "Capex"],
            "row_labels": [
                {"row": 5, "col": 0, "value": "EBITDA"},
                {"row": 6, "col": 0, "value": "Revenue"},
            ],
        },
        "Plant A": {"dims": [50, 10], "text_tokens": ["Production", "Volume"]},
        "Plant B": {"dims": [40, 8], "text_tokens": []},
    },
}


def test_describe_workbook_with_fixture():
    """Story 4.6 AC4: describe_workbook returns lightweight overview — no row_labels dump."""
    mock_loader = MagicMock()
    mock_loader.index = _FIXTURE_INDEX
    with patch("api.services.tools.excel_tools.loader", mock_loader):
        from api.services.tools.excel_tools import describe_workbook
        result = describe_workbook()
    assert "WORKBOOK: test.xlsx" in result
    assert "5 sheets total" in result
    assert "phos → Phos_Consolidated BU" in result
    # Key sheets: name + dims + year range (no row_labels block)
    assert "Phos_Consolidated BU: 100r × 30c" in result
    assert "years 2025–2027" in result
    # row_labels NOT in the output for key sheets (lightweight — use preview_sheet instead)
    assert "row5: EBITDA" not in result
    # Non-BU sheets appear with text_tokens
    assert "Plant A: 50r × 10c" in result
    assert "Production" in result
    assert len(result) <= 8000


def test_describe_workbook_no_index():
    """T7.5: Returns not-available string when loader.index is empty."""
    mock_loader = MagicMock()
    mock_loader.index = {}
    with patch("api.services.tools.excel_tools.loader", mock_loader):
        from api.services.tools.excel_tools import describe_workbook
        result = describe_workbook()
    assert result == "Workbook index not available — run build_workbook_index.py"


def test_describe_workbook_loader_none():
    """T7.5 variant: Returns not-available when loader is None."""
    with patch("api.services.tools.excel_tools.loader", None):
        from api.services.tools.excel_tools import describe_workbook
        result = describe_workbook()
    assert result == "Workbook index not available — run build_workbook_index.py"


def test_describe_workbook_output_cap():
    """Story 4.6 AC4: Output > 8000 chars is truncated at 7900 + sentinel."""
    # Many non-key sheets with long text_tokens list to blow the 8000-char cap
    non_key_names = [f"Sheet_{i}" for i in range(150)]
    long_tokens = [f"token_value_{j}_{'x' * 20}" for j in range(10)]
    big_index = {
        "meta": {"source": "big.xlsx", "total_sheets": 150, "key_sheets_count": 0},
        "bu_aliases": {},
        "sheets": {
            name: {
                "dims": [200, 50],
                "year_header_row": 0,
                "year_cols": {},
                "text_tokens": long_tokens,
            }
            for name in non_key_names
        },
    }
    mock_loader = MagicMock()
    mock_loader.index = big_index
    with patch("api.services.tools.excel_tools.loader", mock_loader):
        from api.services.tools.excel_tools import describe_workbook
        result = describe_workbook()
    assert len(result) <= 8000
    assert "[truncated" in result


# ── Story 4.6: TOOL_REGISTRY / TOOL_SCHEMAS — re-exposed tools ───────────────

def test_tool_registry_excel_tools_present():
    """Story 4.6 AC6: list_sheets, preview_sheet, preview_sheets re-added to TOOL_REGISTRY."""
    from api.services.tools import TOOL_REGISTRY
    for name in ("describe_workbook", "list_sheets", "preview_sheet", "preview_sheets", "run_python"):
        assert name in TOOL_REGISTRY, f"Excel tool missing from registry: {name}"
    # get_sheet_labels remains importable but not in registry (internal use only)
    assert "get_sheet_labels" not in TOOL_REGISTRY


def test_tool_schemas_excel_tools_present():
    """Story 4.6 AC6: list_sheets, preview_sheet, preview_sheets re-added to TOOL_SCHEMAS."""
    from api.services.tools import TOOL_SCHEMAS
    names = {s["function"]["name"] for s in TOOL_SCHEMAS}
    for name in ("describe_workbook", "list_sheets", "preview_sheet", "preview_sheets", "run_python"):
        assert name in names, f"Excel tool missing from schemas: {name}"
    assert "get_sheet_labels" not in names


def test_tool_schemas_keys_match_registry():
    """T7.7: Every TOOL_SCHEMA name has a matching TOOL_REGISTRY entry and vice-versa."""
    from api.services.tools import TOOL_REGISTRY, TOOL_SCHEMAS
    schema_names = {s["function"]["name"] for s in TOOL_SCHEMAS}
    registry_names = set(TOOL_REGISTRY.keys())
    assert schema_names == registry_names, (
        f"Mismatch — schema only: {schema_names - registry_names}, "
        f"registry only: {registry_names - schema_names}"
    )


# ── Story 2.10: build_workbook_index helper functions ────────────────────────

def _load_bwi():
    spec = importlib.util.spec_from_file_location(
        "build_workbook_index",
        Path(__file__).parent.parent / "scripts" / "build_workbook_index.py",
    )
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)  # type: ignore[union-attr]
    return m


_bwi = _load_bwi()


def _make_ws(rows: list[list], max_row: int | None = None):
    """Create a mock openpyxl read-only worksheet that supports iter_rows(values_only=True)."""
    ws = MagicMock()
    ws.max_row = max_row if max_row is not None else len(rows)
    ws.max_column = max(len(r) for r in rows) if rows else 0

    def iter_rows(min_row=1, max_row=None, min_col=1, max_col=None, values_only=True):
        end = (max_row if max_row is not None else len(rows))
        for r_idx in range(min_row - 1, end):
            if r_idx >= len(rows):
                break
            row = rows[r_idx]
            end_col = (max_col if max_col is not None else len(row))
            sliced = [row[c] if c < len(row) else None for c in range(min_col - 1, end_col)]
            yield tuple(sliced)

    ws.iter_rows = iter_rows
    return ws


def test_extract_text_tokens_basic():
    """Story 4.5 AC2: _extract_text_tokens collects unique strings 2–120 chars."""
    rows = [["EBITDA", "Revenue", None], [100, "Capex", "  "], ["EBITDA"]]  # EBITDA appears twice
    ws = _make_ws(rows)
    tokens = _bwi._extract_text_tokens(ws)
    assert "EBITDA" in tokens
    assert "Revenue" in tokens
    assert "Capex" in tokens
    # Deduplication
    assert tokens.count("EBITDA") == 1


def test_extract_text_tokens_length_filter():
    """Story 4.5 AC2: Single-char strings and strings > 120 chars are excluded."""
    long_str = "x" * 121
    rows = [["A", long_str, "OK"]]
    ws = _make_ws(rows)
    tokens = _bwi._extract_text_tokens(ws)
    assert "A" not in tokens
    assert long_str not in tokens
    assert "OK" in tokens


def test_extract_text_tokens_cap_300():
    """Story 4.5 AC2: Output is capped at 300 tokens."""
    rows = [[f"token_{i:04d}"] for i in range(400)]
    ws = _make_ws(rows)
    tokens = _bwi._extract_text_tokens(ws)
    assert len(tokens) <= 300


def test_extract_text_tokens_sorted_by_length():
    """Story 4.5 AC2: Tokens sorted ascending by length (short labels first)."""
    rows = [["A long label string here", "SOP", "EBITDA"]]
    ws = _make_ws(rows)
    tokens = _bwi._extract_text_tokens(ws)
    lengths = [len(t) for t in tokens]
    assert lengths == sorted(lengths)


def test_detect_year_headers_finds_consecutive():
    """T7.2: Row with 2025,2026,2027 in first 6 rows is detected."""
    # Row 0 has nothing; row 1 (0-indexed) has the years
    rows = [
        [None] * 5,
        ["Label", None, None, 2025, 2026, 2027, 2028],
    ]
    ws = _make_ws(rows)
    header_row, year_cols = _bwi._detect_year_headers(ws)
    assert header_row == 1  # 0-indexed
    assert year_cols["2025"] == 3  # 0-based col index
    assert year_cols["2026"] == 4
    assert year_cols["2027"] == 5


def test_detect_year_headers_not_found():
    """T7.2: No year headers → (None, {})."""
    rows = [["Revenue", "Costs", "EBITDA"]] * 6
    ws = _make_ws(rows)
    header_row, year_cols = _bwi._detect_year_headers(ws)
    assert header_row is None
    assert year_cols == {}


def test_extract_row_labels_capped_at_60():
    """T7.3: More than 60 labelled rows are capped at 60."""
    rows = [[f"Label {i}"] for i in range(65)]
    ws = _make_ws(rows)
    labels = _bwi._extract_row_labels(ws, 65)
    assert len(labels) == 60


def test_extract_row_labels_col_b_fallback():
    """T7.3: Empty col A + non-empty col B yields col=1 sub-label."""
    # Row 0: col A = None, col B = "Sub-item"
    rows = [[None, "Sub-item"], ["Revenue", None]]
    ws = _make_ws(rows)
    labels = _bwi._extract_row_labels(ws, 2)
    assert labels[0] == {"row": 0, "col": 1, "value": "Sub-item"}
    assert labels[1] == {"row": 1, "col": 0, "value": "Revenue"}


def test_extract_row_labels_strips_whitespace():
    """T7.3: Leading/trailing whitespace is stripped from label values."""
    rows = [["  EBITDA  "]]
    ws = _make_ws(rows)
    labels = _bwi._extract_row_labels(ws, 1)
    assert labels[0]["value"] == "EBITDA"
