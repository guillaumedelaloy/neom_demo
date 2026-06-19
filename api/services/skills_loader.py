from __future__ import annotations

import functools
import pathlib

from api.services.prompt_loader import PromptConfigError, load_prompt_text

_HERE = pathlib.Path(__file__).parent
_SKILLS_PROMPT_PATH = "skills/catalog.md"
_CATALOGUE_FILE = _HERE.parent / "config" / "data_catalogue.md"


class SkillsConfigError(RuntimeError):
    pass


@functools.lru_cache(maxsize=1)
def load_skills_markdown() -> str:
    try:
        return load_prompt_text(_SKILLS_PROMPT_PATH)
    except PromptConfigError as e:
        raise SkillsConfigError(str(e)) from e


def get_catalogue_text() -> str:
    if not _CATALOGUE_FILE.exists():
        return ""
    return "\n\n---\n## Available Data Sources\n\n" + _CATALOGUE_FILE.read_text(encoding="utf-8")
