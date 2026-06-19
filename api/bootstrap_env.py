"""Load environment variables from the repository root (not only the process cwd)."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

_log = logging.getLogger(__name__)

# Paths successfully passed to load_dotenv (for /api/health?diagnose=1).
DOTENV_LOADED: list[str] = []


def _append_loaded(path: Path) -> None:
    if path.is_file():
        load_dotenv(path, override=True)
        DOTENV_LOADED.append(str(path.resolve()))


def load_repo_dotenv() -> None:
    """Load dotenv files: repo ``.env`` / ``.env.local``, then **different** cwd copies.

    Repo files use ``override=True`` so they win over stale shell exports. If the
    process cwd is **not** the repo root (some IDEs / ``uv run`` layouts), also load
    ``.env`` / ``.env.local`` from ``Path.cwd()`` when they are not the same file as
    the repo copies — otherwise ``LLM_MODEL`` edits in a cwd-only file never apply.
    """
    # Mutate the existing list so importers who did ``from ... import DOTENV_LOADED``
    # still see updates (rebinding ``DOTENV_LOADED = []`` would strand stale refs).
    DOTENV_LOADED.clear()

    repo_root = Path(__file__).resolve().parents[1]
    _append_loaded(repo_root / ".env")
    _append_loaded(repo_root / ".env.local")

    cwd = Path.cwd()
    for name in (".env", ".env.local"):
        p = cwd / name
        if not p.is_file():
            continue
        try:
            same_as_repo = p.resolve() == (repo_root / name).resolve()
        except OSError:
            same_as_repo = False
        if not same_as_repo:
            _append_loaded(p)

    load_dotenv()

    if os.getenv("DEBUG_AGENT", "").lower() in ("1", "true", "yes"):
        _log.info(
            "env after dotenv: LLM_MODEL=%r GATE_MODEL=%r | loaded_files=%s",
            os.environ.get("LLM_MODEL"),
            os.environ.get("GATE_MODEL"),
            DOTENV_LOADED,
        )
