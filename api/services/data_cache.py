from __future__ import annotations

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

PROCESSED_DIR = Path(__file__).parent.parent.parent / "data_extract" / "processed"

_schedules: dict = {}


def load() -> None:
    """
    Load pre-processed data from local JSON files.
    PORTABILITY: Replace the Path reads below with Azure Blob / GCP Storage
    calls when migrating from local VM to cloud storage. Interface unchanged.
    """
    global _schedules

    sched_path = PROCESSED_DIR / "schedules.json"
    if sched_path.exists():
        _schedules = json.loads(sched_path.read_text())
    else:
        # Slim Docker / Railway images often omit `data_extract/`; DEBUG avoids noisy deploy logs.
        logger.debug(
            "schedules.json not found at %s — schedule tools will return empty data",
            sched_path,
        )


def get_schedules() -> dict:
    return _schedules


def get_phos3() -> dict:
    return _schedules.get("detailed", {}).get("phos3_ph1", {})
