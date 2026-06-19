from __future__ import annotations

import functools
from pathlib import Path
import re

import yaml

_HERE = Path(__file__).parent
_PROMPTS_DIR = (_HERE.parent / "prompts").resolve()
_YAML_FENCE_RE = re.compile(r"```yaml\s*\n(.*?)```", re.DOTALL)


class PromptConfigError(RuntimeError):
    pass


class _StrictFormatDict(dict):
    def __missing__(self, key: str):
        raise PromptConfigError(f"Missing prompt template variable: {key}")


def _resolve_prompt_path(relative_path: str) -> Path:
    candidate = (_PROMPTS_DIR / relative_path).resolve()
    if _PROMPTS_DIR not in candidate.parents and candidate != _PROMPTS_DIR:
        raise PromptConfigError(
            f"Prompt path escapes prompts directory: {relative_path}"
        )
    return candidate


@functools.lru_cache(maxsize=None)
def load_prompt_text(relative_path: str) -> str:
    prompt_path = _resolve_prompt_path(relative_path)
    if not prompt_path.exists():
        raise PromptConfigError(f"Prompt file not found: {relative_path}")
    return prompt_path.read_text(encoding="utf-8")


def render_prompt_text(template: str, variables: dict[str, str]) -> str:
    return template.format_map(_StrictFormatDict(variables))


def render_prompt(relative_path: str, variables: dict[str, str]) -> str:
    return render_prompt_text(load_prompt_text(relative_path), variables)


def load_yaml_blocks(relative_path: str) -> tuple[dict, ...]:
    blocks: list[dict] = []
    text = load_prompt_text(relative_path)
    for match in _YAML_FENCE_RE.finditer(text):
        parsed = yaml.safe_load(match.group(1))
        if isinstance(parsed, dict):
            blocks.append(parsed)
    return tuple(blocks)


@functools.lru_cache(maxsize=1)
def load_runtime_messages(relative_path: str = "runtime/agent_runtime.md") -> dict:
    blocks = load_yaml_blocks(relative_path)
    runtime_block = next((b for b in blocks if b.get("kind") == "agent_runtime"), None)
    if not runtime_block:
        raise PromptConfigError(f"Runtime prompt block missing in: {relative_path}")

    not_supported = runtime_block.get("not_supported")
    consolidation_prompt = runtime_block.get("consolidation_prompt")
    pressure_soft = runtime_block.get("pressure_soft")
    pressure_medium = runtime_block.get("pressure_medium")
    pressure_hard = runtime_block.get("pressure_hard")
    # Legacy field kept for backward-compat; ignored if tiered pressure fields are present
    pressure_template = runtime_block.get("pressure_template")
    progress_messages = runtime_block.get("progress_messages", {})

    if not isinstance(not_supported, str) or not not_supported.strip():
        raise PromptConfigError("runtime not_supported must be a non-empty string")

    # Validate tiered pressure messages when present; fall back to legacy pressure_template
    _has_tiered = pressure_soft and pressure_medium and pressure_hard
    if not _has_tiered:
        if (
            not isinstance(pressure_template, str)
            or "{calls_remaining}" not in pressure_template
        ):
            raise PromptConfigError(
                "runtime must define either tiered pressure (pressure_soft/medium/hard) "
                "or a pressure_template containing '{calls_remaining}'"
            )

    if not isinstance(progress_messages, dict):
        raise PromptConfigError("runtime progress_messages must be a mapping")

    cleaned_progress = {
        str(k): str(v)
        for k, v in progress_messages.items()
        if str(k).strip() and str(v).strip()
    }
    result: dict = {
        "not_supported": not_supported.strip(),
        "progress": cleaned_progress,
    }
    if _has_tiered:
        result["pressure_soft"] = str(pressure_soft).strip()
        result["pressure_medium"] = str(pressure_medium).strip()
        result["pressure_hard"] = str(pressure_hard).strip()
    else:
        result["pressure_template"] = str(pressure_template).strip()
    if isinstance(consolidation_prompt, str) and consolidation_prompt.strip():
        result["consolidation_prompt"] = consolidation_prompt.strip()

    # Optional string messages — pass through any non-empty string fields
    for key in ("consolidation_thinking", "llm_unavailable", "bu_schedule_thinking"):
        val = runtime_block.get(key)
        if isinstance(val, str) and val.strip():
            result[key] = val.strip()

    return result
