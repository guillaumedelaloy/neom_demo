from __future__ import annotations

import json
import logging
import os
import uuid
from collections.abc import AsyncGenerator
import logfire
from api.schemas.chatbot_config import load_config
from api.services import llm_client
from api.services.llm_client import _safe_llm_err
from api.services.prompt_loader import load_runtime_messages
from api.services.tools import TOOL_REGISTRY, TOOL_SCHEMAS

_DEBUG = os.getenv("DEBUG_AGENT", "").lower() in ("1", "true", "yes")
_CFG = load_config()
_log = logging.getLogger(__name__)


def _dbg(*args) -> None:
    if _DEBUG:
        print("[agent]", *args, flush=True)


_RUNTIME_MESSAGES = load_runtime_messages()
_NOT_SUPPORTED = _RUNTIME_MESSAGES["not_supported"]
_PROGRESS: dict[str, str] = _RUNTIME_MESSAGES["progress"]
_CONSOLIDATION_PROMPT: str | None = _RUNTIME_MESSAGES.get("consolidation_prompt")
_CONSOLIDATION_THINKING: str = _RUNTIME_MESSAGES.get(
    "consolidation_thinking", "Consolidating findings…"
)
_LLM_UNAVAILABLE: str = _RUNTIME_MESSAGES.get("llm_unavailable", "LLM unavailable")
_BU_SCHEDULE_THINKING: str = _RUNTIME_MESSAGES.get(
    "bu_schedule_thinking", "Loading schedule for {bu_code}…"
)

# Tiered pressure messages — fall back to legacy single template
_PRESSURE_SOFT: str | None = _RUNTIME_MESSAGES.get("pressure_soft")
_PRESSURE_MEDIUM: str | None = _RUNTIME_MESSAGES.get("pressure_medium")
_PRESSURE_HARD: str | None = _RUNTIME_MESSAGES.get("pressure_hard")
_PRESSURE_TEMPLATE: str | None = _RUNTIME_MESSAGES.get("pressure_template")

_MAX_ROUNDS = _CFG.max_rounds


def _pct_threshold(max_rounds: int, pct: int) -> int:
    """Map an integer percentage to a 0-indexed round threshold."""
    threshold = ((max_rounds * pct + 99) // 100) - 1
    return min(max(threshold, 0), max_rounds - 1)


# Progressive pressure thresholds (0-indexed round numbers)
_SOFT_THRESHOLD = _pct_threshold(_MAX_ROUNDS, _CFG.pressure_soft_pct)
_MEDIUM_THRESHOLD = _pct_threshold(_MAX_ROUNDS, _CFG.pressure_medium_pct)
_HARD_THRESHOLD = _pct_threshold(_MAX_ROUNDS, _CFG.pressure_hard_pct)


def _pressure_msg(round_num: int) -> dict | None:
    """Return an escalating pressure system message, or None if not yet needed."""
    calls_remaining = _MAX_ROUNDS - round_num

    if _PRESSURE_SOFT and _PRESSURE_MEDIUM and _PRESSURE_HARD:
        # Tiered pressure
        if round_num >= _HARD_THRESHOLD:
            content = _PRESSURE_HARD.format(calls_remaining=calls_remaining)
        elif round_num >= _MEDIUM_THRESHOLD:
            content = _PRESSURE_MEDIUM.format(calls_remaining=calls_remaining)
        elif round_num >= _SOFT_THRESHOLD:
            content = _PRESSURE_SOFT.format(calls_remaining=calls_remaining)
        else:
            return None
    elif _PRESSURE_TEMPLATE:
        # Legacy single-tier pressure (last 3 rounds only)
        if round_num >= _MAX_ROUNDS - 3:
            content = _PRESSURE_TEMPLATE.format(calls_remaining=calls_remaining)
        else:
            return None
    else:
        return None

    return {"role": "system", "content": content}


def _thinking_msg(tool_name: str, args: dict) -> str | None:
    if tool_name not in _PROGRESS:
        return None
    if tool_name == "get_bu_schedule":
        bu = args.get("bu_code", "")
        return _BU_SCHEDULE_THINKING.format(bu_code=bu) if bu else _PROGRESS[tool_name]
    return _PROGRESS[tool_name]


def _assistant_msg(msg) -> dict:
    d: dict = {"role": "assistant", "content": msg.content}
    if msg.tool_calls:
        d["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in msg.tool_calls
        ]
    return d


async def _consolidation_call(history: list[dict]) -> str | None:
    """Make a final LLM call asking the model to answer with what it has.

    Returns the content string, or None if the call fails or returns empty.
    """
    if not _CONSOLIDATION_PROMPT:
        return None

    consolidation_msg = {"role": "system", "content": _CONSOLIDATION_PROMPT}
    try:
        content = await llm_client.complete_chat([consolidation_msg] + history)
        return content if content and content.strip() else None
    except Exception:
        _dbg("consolidation call failed")
        return None


async def stream_agent_response(
    messages: list[dict],
    system_prompt: str,
    tool_schemas: list[dict] | None = None,
    tool_registry: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Tool-calling agent loop. Yields SSE-formatted events.

    tool_schemas / tool_registry: scoped to the calling agent when provided;
    falls back to the full global sets so callers that pre-date scoping still work.
    """
    schemas = tool_schemas if tool_schemas is not None else TOOL_SCHEMAS
    registry = tool_registry if tool_registry is not None else TOOL_REGISTRY

    system_msg = {"role": "system", "content": system_prompt}
    history = [system_msg] + messages
    tool_calls_made: list[str] = []

    for round_num in range(_MAX_ROUNDS):
        _dbg(f"── round {round_num + 1}/{_MAX_ROUNDS} ──")

        pressure = _pressure_msg(round_num)
        history_for_this_round = [pressure] + history if pressure else history

        with logfire.span("agent round {round}", round=round_num + 1):
            try:
                response = await llm_client.chat_with_tools(
                    history_for_this_round, schemas
                )
            except Exception as e:
                safe = _safe_llm_err(str(e))
                _log.error("chat_with_tools failed: %s — %s", type(e).__name__, safe)
                err_text = _LLM_UNAVAILABLE
                if _DEBUG and safe:
                    err_text = f"{_LLM_UNAVAILABLE} (debug: {type(e).__name__}: {safe})"
                yield f"data: {json.dumps({'type': 'error', 'content': err_text})}\n\n"
                return
            msg = response.choices[0].message

            if not msg.tool_calls:
                _dbg(
                    f"no tool calls — generating final answer (tools used: {tool_calls_made})"
                )
                logfire.info("final answer", tools_used=tool_calls_made)
                content = msg.content

                # Empty content: attempt consolidation recovery instead of canned message
                if not content or not content.strip():
                    _dbg("empty response — attempting consolidation recovery")
                    content = await _consolidation_call(history)
                    if content:
                        yield f"data: {json.dumps({'type': 'thinking', 'content': _CONSOLIDATION_THINKING})}\n\n"
                    else:
                        content = _NOT_SUPPORTED

                for line in content.splitlines(keepends=True):
                    yield f"data: {json.dumps({'type': 'token', 'content': line})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
                return

            history.append(_assistant_msg(msg))
            # Surface any model reasoning emitted alongside tool calls
            if msg.content and msg.content.strip():
                yield f"data: {json.dumps({'type': 'thinking', 'content': msg.content.strip()})}\n\n"
            for tc in msg.tool_calls:
                tool_calls_made.append(tc.function.name)
                args = json.loads(tc.function.arguments or "{}")
                _dbg(
                    f"→ {tc.function.name}({', '.join(f'{k}={repr(v)[:80]}' for k, v in args.items())})"
                )
                thinking = _thinking_msg(tc.function.name, args)
                if thinking:
                    yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"
                with logfire.span("tool call {tool}", tool=tc.function.name, args=args):
                    result = registry.get(tc.function.name)
                    tool_result = (
                        result(**args)
                        if result
                        else {"error": f"Unknown tool: {tc.function.name}"}
                    )
                # Emit chart spec to frontend if present
                if isinstance(tool_result, dict) and "chart_spec" in tool_result:
                    chart_event = {
                        "type": "chart",
                        "content": json.dumps(
                            {
                                "id": f"chart-{uuid.uuid4().hex[:8]}",
                                **tool_result["chart_spec"],
                            }
                        ),
                    }
                    yield f"data: {json.dumps(chart_event)}\n\n"
                # Inject remaining budget into dict results so the model self-monitors
                if isinstance(tool_result, dict):
                    tool_result["_meta"] = {
                        "calls_remaining": _MAX_ROUNDS - round_num - 1
                    }
                result_preview = json.dumps(tool_result)[:200]
                _dbg(
                    f"← {result_preview}{'...' if len(json.dumps(tool_result)) > 200 else ''}"
                )
                history.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(tool_result),
                    }
                )

    # Max rounds exhausted — attempt consolidation instead of canned message
    _dbg(f"max rounds ({_MAX_ROUNDS}) exhausted — attempting consolidation")
    logfire.warn("max rounds exhausted", tools_used=tool_calls_made)
    yield f"data: {json.dumps({'type': 'thinking', 'content': _CONSOLIDATION_THINKING})}\n\n"

    content = await _consolidation_call(history)
    if content:
        for line in content.splitlines(keepends=True):
            yield f"data: {json.dumps({'type': 'token', 'content': line})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
    else:
        yield f"data: {json.dumps({'type': 'not_supported', 'content': _NOT_SUPPORTED})}\n\n"
