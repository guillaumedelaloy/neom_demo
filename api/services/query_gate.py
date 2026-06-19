from __future__ import annotations

import json
import logging
import os
from typing import TypedDict

from api.services import llm_client
from api.services.prompt_loader import load_prompt_text, render_prompt

_log = logging.getLogger(__name__)

_GATE_PROMPT_PATH = "system/query_gate.md"
_GATE_CONTEXT_PROMPT_PATH = "system/query_gate_context.md"


class GateResult(TypedDict):
    outcome: str          # "out_of_scope" | "needs_clarification" | "pass"
    payload: str | None


def _gate_model() -> str:
    return os.environ.get("GATE_MODEL", "openai/gpt-4o-mini")


_PASS_RESULT: GateResult = {"outcome": "pass", "payload": None}


def _extract_json(raw: str) -> str:
    """Strip markdown code fences if the model wrapped its JSON output."""
    stripped = raw.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        inner = [l for l in lines[1:] if l.strip() != "```"]
        return "\n".join(inner).strip()
    return stripped


def _build_context_note(context: dict) -> str:
    """Build a brief note for the gate about the user's current dashboard context."""
    scope = context.get("scope", "global")
    has_page = bool(context.get("page") or context.get("pageEntities"))
    if scope == "global" and not has_page:
        return ""
    parts = [f"scope={scope}"]
    if context.get("page"):
        parts.append(f"page={context['page']!r}")
    if context.get("projectName"):
        parts.append(f"project={context['projectName']!r}")
    if context.get("bu"):
        parts.append(f"BU={context['bu']!r}")
    if context.get("kpiLabel"):
        parts.append(f"KPI={context['kpiLabel']!r}")
    return render_prompt(_GATE_CONTEXT_PROMPT_PATH, {"context_details": ", ".join(parts)})


async def assess(messages: list[dict], context: dict | None = None) -> GateResult:
    """Evaluate the latest query before the main agent loop.

    Only runs on the first turn; follow-up turns pass through unconditionally.
    Fails open — any exception returns pass so the gate never blocks the user.
    """
    if any(m.get("role") == "assistant" for m in messages):
        return _PASS_RESULT
    try:
        gate_prompt = load_prompt_text(_GATE_PROMPT_PATH)
        context_note = _build_context_note(context) if context else ""
        full_gate_prompt = f"{context_note}\n\n{gate_prompt}" if context_note else gate_prompt
        window = messages[-3:]
        gate_messages = [{"role": "system", "content": full_gate_prompt}] + window
        raw = await llm_client.complete_chat(gate_messages, model=_gate_model())
        _log.debug("gate raw response: %s", raw)
        if not raw or not raw.strip():
            _log.warning("gate returned empty response — failing open")
            return _PASS_RESULT
        parsed = json.loads(_extract_json(raw))
        outcome = parsed["outcome"]
        payload = parsed.get("payload")
        if outcome not in ("out_of_scope", "needs_clarification", "pass"):
            return _PASS_RESULT
        return {"outcome": outcome, "payload": payload}
    except Exception:
        _log.warning("query gate failed — failing open", exc_info=True)
        return _PASS_RESULT
