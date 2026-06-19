"""Load environment variables from the repository root (not only the process cwd)."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv


def load_repo_dotenv() -> None:
    """Load `.env` from repo root, then optionally from cwd (does not override set vars)."""
    repo_root = Path(__file__).resolve().parents[1]
    load_dotenv(repo_root / ".env")
    load_dotenv()
