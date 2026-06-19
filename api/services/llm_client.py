import os
import json
import logging
import re
from collections.abc import AsyncGenerator
import litellm
import logfire

from api.schemas.chatbot_config import load_config

_log = logging.getLogger(__name__)

_SECRET_SCRUB = re.compile(
    r"(sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{8,}|sk-proj-[A-Za-z0-9_-]{8,}|"
    r"api_key\s*=\s*['\"][^'\"]{8,}['\"])",
    re.I,
)


def _safe_llm_err(text: str, limit: int = 450) -> str:
    if not text:
        return ""
    one = text.replace("\r", " ").replace("\n", " ")[:limit]
    return _SECRET_SCRUB.sub("***", one)


_cfg = load_config()

# Anthropic Opus 4.7+ rejects non-default sampling params (400) — omit temperature.
_NO_TEMPERATURE_MODEL_MARKERS = ("claude-opus-4-7", "claude-opus-4-8")


def _model() -> str:
    return os.environ.get("LLM_MODEL", _cfg.model)


def _omit_temperature(model: str) -> bool:
    m = model.lower()
    return any(marker in m for marker in _NO_TEMPERATURE_MODEL_MARKERS)


def _anthropic_opus_kwargs(model: str) -> dict:
    """Opus 4.7/4.8: use LiteLLM reasoning_effort → adaptive thinking + output_config; generous max_tokens for tools."""
    m = model.lower()
    if "claude-opus-4-7" not in m and "claude-opus-4-8" not in m:
        return {}
    return {
        "reasoning_effort": "medium",
        "max_tokens": 16384,
    }


def _api_key() -> str:
    # Backward-compatible key lookup order across docs/environments.
    key = (
        os.environ.get("LLM_API_KEY")
        or os.environ.get("AI_API_KEY")
        or os.environ.get("ANTHROPIC_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )
    if not key:
        raise RuntimeError(
            "No LLM API key found. Set one of: LLM_API_KEY, AI_API_KEY, "
            "ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY."
        )
    return key


def _completion_kwargs(model: str, messages: list[dict], **extra: object) -> dict:
    kwargs: dict = dict(model=model, api_key=_api_key(), messages=messages, **extra)
    kwargs.update(_anthropic_opus_kwargs(model))
    if not _omit_temperature(model):
        kwargs["temperature"] = _cfg.temperature
    return kwargs


async def complete_chat(
    messages: list[dict],
    model: str | None = None,
    response_format: dict | None = None,
) -> str:
    kwargs = _completion_kwargs(
        model or _model(),
        messages,
        stream=False,
    )
    if response_format:
        kwargs["response_format"] = response_format
    try:
        response = await litellm.acompletion(**kwargs)
        return response.choices[0].message.content or ""
    except Exception as e:
        _log.error("LLM call failed: %s — %s", type(e).__name__, _safe_llm_err(str(e)))
        raise


async def chat_with_tools(messages: list[dict], tools: list[dict]):
    """Non-streaming call with tool schemas. Returns raw LiteLLM response for tool_calls inspection."""
    with logfire.span(
        "llm {model}",
        model=_model(),
        message_count=len(messages),
        tool_count=len(tools),
        messages=messages,
        tools=[t.get("function", {}).get("name") for t in tools],
    ):
        try:
            m = _model()
            response = await litellm.acompletion(
                **_completion_kwargs(m, messages, tools=tools, stream=False),
            )
            usage = getattr(response, "usage", None)
            if usage:
                logfire.info(
                    "llm response",
                    input_tokens=getattr(usage, "prompt_tokens", None),
                    output_tokens=getattr(usage, "completion_tokens", None),
                )
            return response
        except Exception as e:
            _log.error("LLM tool call failed: %s — %s", type(e).__name__, _safe_llm_err(str(e)))
            raise


async def stream_chat(
    messages: list[dict],
    error_message: str = "LLM unavailable",
) -> AsyncGenerator[str, None]:
    try:
        response = await litellm.acompletion(
            **_completion_kwargs(_model(), messages, stream=True),
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
    except Exception as e:
        _log.error("LLM stream failed: %s — %s", type(e).__name__, _safe_llm_err(str(e)))
        yield f"data: {json.dumps({'type': 'error', 'content': error_message})}\n\n"
