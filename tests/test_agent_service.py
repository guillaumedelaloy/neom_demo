import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def _make_response(content=None, tool_calls=None):
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = tool_calls
    return MagicMock(choices=[MagicMock(message=msg)])


def _make_tool_call(name: str, arguments: str, call_id: str = "call_1"):
    tc = MagicMock()
    tc.id = call_id
    tc.function.name = name
    tc.function.arguments = arguments
    return tc


def _parse_events(events: list[str]) -> list[dict]:
    return [json.loads(e.replace("data: ", "")) for e in events]


_SYSTEM_PROMPT = "Test system prompt"


def test_pct_threshold_maps_integer_percentages_to_round_indexes():
    from api.services.agent_service import _pct_threshold

    assert _pct_threshold(30, 60) == 17
    assert _pct_threshold(30, 80) == 23
    assert _pct_threshold(30, 100) == 29


def test_max_rounds_reads_config_default():
    from api.services.agent_service import _MAX_ROUNDS

    assert _MAX_ROUNDS == 30


@pytest.mark.asyncio
async def test_direct_response_no_tools_streams_answer():
    resp = _make_response(content="Phosphate is at risk")
    with patch(
        "api.services.agent_service.llm_client.chat_with_tools",
        AsyncMock(return_value=resp),
    ):
        from api.services.agent_service import stream_agent_response

        events = [
            e
            async for e in stream_agent_response(
                [{"role": "user", "content": "hi"}],
                system_prompt=_SYSTEM_PROMPT,
            )
        ]

    parsed = _parse_events(events)
    types = [p["type"] for p in parsed]
    assert "token" in types
    assert types[-1] == "done"


@pytest.mark.asyncio
async def test_tool_call_round_then_response():
    tc = _make_tool_call("get_bu_kpi_summary", '{"bu_code": "phosphate"}')
    resp1 = _make_response(tool_calls=[tc])
    resp2 = _make_response(content="Capex is 20% above plan")

    with patch(
        "api.services.agent_service.llm_client.chat_with_tools",
        AsyncMock(side_effect=[resp1, resp2]),
    ):
        from api.services.agent_service import stream_agent_response

        events = [
            e
            async for e in stream_agent_response(
                [{"role": "user", "content": "phosphate capex?"}],
                system_prompt=_SYSTEM_PROMPT,
            )
        ]

    parsed = _parse_events(events)
    types = [p["type"] for p in parsed]
    assert "token" in types
    assert types[-1] == "done"


@pytest.mark.asyncio
async def test_max_rounds_exhausted_consolidation_succeeds():
    """When all rounds are used up and consolidation succeeds, the user gets a real answer."""
    tc = _make_tool_call("get_bu_kpi_summary", '{"bu_code": "phosphate"}')
    resp = _make_response(tool_calls=[tc])

    with (
        patch(
            "api.services.agent_service.llm_client.chat_with_tools",
            AsyncMock(return_value=resp),
        ),
        patch(
            "api.services.agent_service.llm_client.complete_chat",
            AsyncMock(return_value="Here is a partial answer with low confidence."),
        ),
    ):
        from api.services.agent_service import stream_agent_response

        events = [
            e
            async for e in stream_agent_response(
                [{"role": "user", "content": "?"}],
                system_prompt=_SYSTEM_PROMPT,
            )
        ]

    parsed = _parse_events(events)
    types = [p["type"] for p in parsed]
    # Should get thinking + token + done, NOT not_supported
    assert "token" in types
    assert types[-1] == "done"
    assert "not_supported" not in types
    full_text = "".join(p["content"] for p in parsed if p["type"] == "token")
    assert "partial answer" in full_text


@pytest.mark.asyncio
async def test_max_rounds_exhausted_consolidation_fails_emits_not_supported():
    """When consolidation also fails, fall back to not_supported."""
    tc = _make_tool_call("get_bu_kpi_summary", '{"bu_code": "phosphate"}')
    resp = _make_response(tool_calls=[tc])

    with (
        patch(
            "api.services.agent_service.llm_client.chat_with_tools",
            AsyncMock(return_value=resp),
        ),
        patch(
            "api.services.agent_service.llm_client.complete_chat",
            AsyncMock(return_value=""),
        ),
    ):
        from api.services.agent_service import stream_agent_response

        events = [
            e
            async for e in stream_agent_response(
                [{"role": "user", "content": "?"}],
                system_prompt=_SYSTEM_PROMPT,
            )
        ]

    parsed = _parse_events(events)
    types = [p["type"] for p in parsed]
    assert "not_supported" in types
    ns_event = next(p for p in parsed if p["type"] == "not_supported")
    assert "relevant Maaden evidence" in ns_event["content"]


@pytest.mark.asyncio
async def test_empty_content_triggers_consolidation_recovery():
    """When tools were called but the final answer is empty, consolidation is attempted."""
    # Round 1: tool call; Round 2: empty final response (tools were used)
    tc = _make_tool_call("get_schedule_overview", "{}")
    tool_resp = _make_response(tool_calls=[tc])
    empty_resp = _make_response(content="")

    responses = [tool_resp, empty_resp]
    call_count = 0

    async def fake_chat(history, schemas):
        nonlocal call_count
        result = responses[call_count]
        call_count += 1
        return result

    with (
        patch(
            "api.services.agent_service.llm_client.chat_with_tools",
            side_effect=fake_chat,
        ),
        patch(
            "api.services.agent_service.llm_client.complete_chat",
            AsyncMock(return_value="Based on limited evidence, here is what I found."),
        ),
    ):
        from api.services.agent_service import stream_agent_response

        events = [
            e
            async for e in stream_agent_response(
                [{"role": "user", "content": "complex question"}],
                system_prompt=_SYSTEM_PROMPT,
                tool_registry={"get_schedule_overview": lambda: {}},
                tool_schemas=[],
            )
        ]

    parsed = _parse_events(events)
    types = [p["type"] for p in parsed]
    assert "token" in types
    assert types[-1] == "done"
    full_text = "".join(p["content"] for p in parsed if p["type"] == "token")
    assert "limited evidence" in full_text


@pytest.mark.asyncio
async def test_empty_content_consolidation_fails_uses_not_supported():
    """When tools were called, final answer is empty, and consolidation also fails → not_supported via tokens."""
    tc = _make_tool_call("get_schedule_overview", "{}")
    tool_resp = _make_response(tool_calls=[tc])
    empty_resp = _make_response(content=None)

    responses = [tool_resp, empty_resp]
    call_count = 0

    async def fake_chat(history, schemas):
        nonlocal call_count
        result = responses[call_count]
        call_count += 1
        return result

    with (
        patch(
            "api.services.agent_service.llm_client.chat_with_tools",
            side_effect=fake_chat,
        ),
        patch(
            "api.services.agent_service.llm_client.complete_chat",
            AsyncMock(side_effect=Exception("LLM down")),
        ),
    ):
        from api.services.agent_service import stream_agent_response

        events = [
            e
            async for e in stream_agent_response(
                [{"role": "user", "content": "complex question"}],
                system_prompt=_SYSTEM_PROMPT,
                tool_registry={"get_schedule_overview": lambda: {}},
                tool_schemas=[],
            )
        ]

    parsed = _parse_events(events)
    types = [p["type"] for p in parsed]
    assert "token" in types
    assert types[-1] == "done"
    full_text = "".join(p["content"] for p in parsed if p["type"] == "token")
    assert "relevant Maaden evidence" in full_text
