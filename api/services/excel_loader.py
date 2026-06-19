import json
import logging
from pathlib import Path

import pandas as pd

EXCEL_PATH = (
    Path(__file__).parent.parent.parent
    / "data_extract/strategy/financial_model"
    / "v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx"
)
INDEX_PATH = (
    Path(__file__).parent.parent.parent
    / "data_extract/processed/workbook_index.json"
)

_log = logging.getLogger(__name__)


class LazyExcelLoader:
    def __init__(self, path: str) -> None:
        self._path = path
        self._cache: dict[str, pd.DataFrame] = {}
        self._xl = pd.ExcelFile(path, engine="openpyxl")
        if INDEX_PATH.exists():
            self.index: dict = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        else:
            self.index = {}
            _log.warning("workbook_index.json not found — run scripts/build_workbook_index.py")

    def sheet_names(self) -> list[str]:
        return self._xl.sheet_names

    def dimensions(self) -> dict[str, tuple[int, int]]:
        return {
            name: (self._xl.book[name].max_row, self._xl.book[name].max_column)
            for name in self._xl.sheet_names
        }

    def __getitem__(self, name: str) -> pd.DataFrame:
        if name not in self._cache:
            self._cache[name] = self._xl.parse(name, header=None)
        return self._cache[name]


def find_data_start(df: pd.DataFrame) -> pd.DataFrame:
    row_mask = df.notna().any(axis=1)
    col_mask = df.notna().any(axis=0)
    if not row_mask.any():
        return df  # all-NaN sheet — return as-is
    row_start = int(row_mask.idxmax())
    col_start = int(col_mask.idxmax())
    return df.iloc[row_start:, col_start:].reset_index(drop=True)


try:
    loader = LazyExcelLoader(str(EXCEL_PATH))
except FileNotFoundError:
    _log.warning("Excel file not found: %s", EXCEL_PATH)
    loader = None  # type: ignore[assignment]
