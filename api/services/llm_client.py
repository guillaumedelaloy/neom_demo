import os
import json
import logging
import re
from collections.abc import AsyncGenerator
import litellm
import logfire

from api.schemas.chatbot_config import load_config

_log = logging.getLogger(__name__)


def _configure_litellm_tls() -> None:
    """Align LiteLLM with ``SSL_VERIFY`` / ``SSL_CERT_FILE`` (corporate MITM, macOS bundles).

    https://docs.litellm.ai/docs/guides/security_settings
    """
    flag = os.environ.get("SSL_VERIFY", "").strip().lower()
    if flag in ("0", "false", "no", "off"):
        litellm.ssl_verify = False
        # DEBUG: expected for some local/corp setups; unset SSL_VERIFY on public deploys.
        _log.debug(
            "SSL_VERIFY=%r — TLS verification disabled for LLM HTTP clients",
            os.environ.get("SSL_VERIFY"),
        )
        return
    cert = os.environ.get("SSL_CERT_FILE", "").strip()
    if cert and os.path.isfile(cert):
        litellm.ssl_verify = cert
        _log.info("LiteLLM TLS: ssl_verify CA bundle from SSL_CERT_FILE=%s", cert)
    elif cert:
        _log.warning("SSL_CERT_FILE is set but not a readable file: %r", cert)


_configure_litellm_tls()

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


def _warn_retired_anthropic_model_env() -> None:
    """Log once if env still points at Anthropic snapshot ids retired on the public API (mid-2026)."""
    combined = " ".join(os.environ.get(k, "") for k in ("LLM_MODEL", "GATE_MODEL"))
    if "anthropic/" not in combined.lower():
        return
    hints: list[str] = []
    if "20250514" in combined:
        hints.append(
            "replace dated *-4-20250514 snapshots with anthropic/claude-sonnet-4-6 "
            "(or claude-sonnet-4-5-20250929) and opus *-20250514 with anthropic/claude-opus-4-8"
        )
    if "claude-3-5-haiku-20241022" in combined:
        hints.append(
            "replace claude-3-5-haiku-20241022 with anthropic/claude-haiku-4-5-20251001 "
            "(or another active Haiku id)"
        )
    if hints:
        _log.warning(
            "LLM_MODEL / GATE_MODEL use retired Anthropic API ids — requests will 404 until updated. "
            + " ".join(hints)
            + ". See README §2 and https://platform.claude.com/docs/en/about-claude/model-deprecations"
        )


_warn_retired_anthropic_model_env()

_warned_missing_llm_env = False


def _maybe_warn_missing_llm_env() -> None:
    """If LLM_MODEL is not in the process environment, we fall back to api/config/config.yml."""
    global _warned_missing_llm_env
    if _warned_missing_llm_env or "LLM_MODEL" in os.environ:
        return
    _warned_missing_llm_env = True
    _log.warning(
        "LLM_MODEL is not set in the process environment — using api/config/config.yml "
        "default %r. Put LLM_MODEL=... in the repo .env or .env.local next to pyproject.toml, "
        "or open http://localhost:5173/api/health?diagnose=1 to see which dotenv files loaded.",
        _cfg.model,
    )


# Anthropic Opus 4.7+ rejects non-default sampling params (400) — omit temperature.
# OpenAI GPT-5.5 family uses reasoning controls; omit fixed temperature (see OpenAI model guide).
_NO_TEMPERATURE_MODEL_MARKERS = (
    "claude-opus-4-7",
    "claude-opus-4-8",
    "gpt-5.5",
)


def _model() -> str:
    return os.environ.get("LLM_MODEL", _cfg.model)


def get_resolved_chat_model() -> str:
    """Main agent model id passed to LiteLLM (health + chat stream meta)."""
    _maybe_warn_missing_llm_env()
    return _model()


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


def _openai_gpt5_reasoning_kwargs(model: str) -> dict:
    """GPT-5.5: LiteLLM/OpenAI expect reasoning_effort; avoids relying on temperature."""
    m = (model or "").lower()
    if not m.startswith("openai/") or "gpt-5.5" not in m:
        return {}
    if "gpt-5.5-pro" in m:
        return {"reasoning_effort": "high"}
    return {"reasoning_effort": "medium"}


def _openai_max_output_kwargs(model: str) -> dict:
    """Cap completion reservation for OpenAI — lowers per-request TPM 'requested' on low tiers.

    Override with LLM_MAX_COMPLETION_TOKENS (e.g. 1024 for very tight limits).
    GPT-5.5 defaults higher when unset (tiered accounts often use longer completions).
    """
    if not (model or "").lower().startswith("openai/"):
        return {}
    m = (model or "").lower()
    default_cap = 8192 if "gpt-5.5" in m else 2048
    raw = os.environ.get("LLM_MAX_COMPLETION_TOKENS", str(default_cap)).strip()
    try:
        n = int(raw)
    except ValueError:
        n = default_cap
    if n < 256:
        n = 256
    if n > 16384:
        n = 16384
    return {"max_tokens": n}


def _api_key() -> str:
    """Generic key (legacy order). Prefer `_api_key_for_model` for completions."""
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


def _api_key_for_model(model: str) -> str:
    """Pick an API key that matches the model's provider.

    Avoids using ANTHROPIC_API_KEY (or a generic LLM_API_KEY) for `openai/*` models when
    OPENAI_API_KEY is the only valid key — a common cause of 'model call failed' in demos.
    """
    m = (model or "").lower()
    if m.startswith("openai/"):
        key = (
            os.environ.get("OPENAI_API_KEY")
            or os.environ.get("LLM_API_KEY")
            or os.environ.get("AI_API_KEY")
        )
        if key:
            return key
        raise RuntimeError(
            "OPENAI_API_KEY is required for OpenAI models (LLM_MODEL / GATE_MODEL starting with "
            "'openai/'). Set OPENAI_API_KEY or LLM_API_KEY to your OpenAI secret."
        )
    if m.startswith("anthropic/"):
        key = (
            os.environ.get("ANTHROPIC_API_KEY")
            or os.environ.get("LLM_API_KEY")
            or os.environ.get("AI_API_KEY")
        )
        if key:
            return key
        raise RuntimeError(
            "ANTHROPIC_API_KEY (or LLM_API_KEY) is required for Anthropic models "
            "(LLM_MODEL / GATE_MODEL starting with 'anthropic/')."
        )
    return _api_key()


def _completion_kwargs(model: str, messages: list[dict], **extra: object) -> dict:
    kwargs: dict = dict(model=model, api_key=_api_key_for_model(model), messages=messages, **extra)
    kwargs.update(_anthropic_opus_kwargs(model))
    kwargs.update(_openai_gpt5_reasoning_kwargs(model))
    if "max_tokens" not in kwargs:
        kwargs.update(_openai_max_output_kwargs(model))
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
