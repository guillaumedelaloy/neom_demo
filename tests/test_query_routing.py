import json
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.index import app
from api.routers.query import _build_system_prompt, _is_followup
from api.services.skills_loader import SkillsConfigError


def _parse_sse_events(text: str) -> list[dict]:
    events = []
    for line in text.splitlines():
        if line.startswith("data: "):
            events.append(json.loads(line[len("data: ") :]))
    return events


def test_is_followup_detects_second_user_turn():
    assert _is_followup([{"role": "user", "content": "EBITDA 2025?"}]) is False
    assert (
        _is_followup(
            [
                {"role": "user", "content": "EBITDA 2025?"},
                {"role": "user", "content": "And 2024?"},
            ]
        )
        is True
    )


def test_is_followup_detects_assistant_history():
    assert (
        _is_followup(
            [
                {"role": "user", "content": "EBITDA 2025?"},
                {"role": "assistant", "content": "The EBITDA is..."},
                {"role": "user", "content": "And 2024?"},
            ]
        )
        is True
    )


def test_build_system_prompt_uses_initial_prompt_for_first_turn():
    def _render(path: str, variables: dict) -> str:
        if path == "system/core.md":
            return "CORE"
        raise AssertionError(f"unexpected render path: {path}")

    def _load(path: str) -> str:
        if path == "system/confidence.md":
            return "CONFIDENCE"
        if path == "system/reasoning_trace.md":
            return "REASONING"
        if path == "system/initial.md":
            return "INITIAL"
        if path == "system/response_template_initial.md":
            return "TEMPLATE_INITIAL"
        raise AssertionError(f"unexpected load path: {path}")

    with (
        patch("api.routers.query.load_skills_markdown", return_value="# skills"),
        patch("api.routers.query.get_catalogue_text", return_value=""),
        patch("api.routers.query.render_prompt", side_effect=_render),
        patch("api.routers.query.load_prompt_text", side_effect=_load),
    ):
        text = _build_system_prompt([{"role": "user", "content": "EBITDA 2025?"}])
    assert text == "CORE\n\nCONFIDENCE\n\nREASONING\n\nINITIAL\n\nTEMPLATE_INITIAL\n\n# skills"


def test_build_system_prompt_uses_followup_prompt_for_followup_turn():
    def _render(path: str, variables: dict) -> str:
        if path == "system/core.md":
            return "CORE"
        raise AssertionError(f"unexpected render path: {path}")

    def _load(path: str) -> str:
        if path == "system/confidence.md":
            return "CONFIDENCE"
        if path == "system/reasoning_trace.md":
            return "REASONING"
        if path == "system/followup.md":
            return "FOLLOWUP"
        if path == "system/response_template_followup.md":
            return "TEMPLATE_FOLLOWUP"
        raise AssertionError(f"unexpected load path: {path}")

    with (
        patch("api.routers.query.load_skills_markdown", return_value="# skills"),
        patch("api.routers.query.get_catalogue_text", return_value=""),
        patch("api.routers.query.render_prompt", side_effect=_render),
        patch("api.routers.query.load_prompt_text", side_effect=_load),
    ):
        text = _build_system_prompt(
            [
                {"role": "user", "content": "EBITDA 2025?"},
                {"role": "assistant", "content": "It is ..."},
                {"role": "user", "content": "And 2024?"},
            ]
        )
    assert text == "CORE\n\nCONFIDENCE\n\nREASONING\n\nFOLLOWUP\n\nTEMPLATE_FOLLOWUP\n\n# skills"


@pytest.mark.asyncio
async def test_query_streams_answer_without_agent_event():
    import json as _json

    async def _fake_stream(
        messages, system_prompt=None, tool_schemas=None, tool_registry=None
    ):
        yield f"data: {_json.dumps({'type': 'token', 'content': 'hello '})}\n\n"
        yield f"data: {_json.dumps({'type': 'done', 'content': ''})}\n\n"

    with (
        patch("api.routers.query.load_skills_markdown", return_value="# skills"),
        patch("api.routers.query.get_catalogue_text", return_value=""),
        patch(
            "api.routers.query.agent_service.stream_agent_response",
            side_effect=_fake_stream,
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/query",
                json={
                    "messages": [
                        {
                            "role": "user",
                            "content": "Give me the latest milestone delays",
                        }
                    ]
                },
            )

    assert response.status_code == 200
    events = _parse_sse_events(response.text)
    # Gate now emits clarification-agent and data-extraction agent events before the stream
    agent_ids = [e.get("agent_id") for e in events if e["type"] == "agent"]
    assert "clarification-agent" in agent_ids
    assert "data-extraction" in agent_ids
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_query_without_skill_match_still_streams_answer():
    import json as _json
    from unittest.mock import AsyncMock

    _pass = {"outcome": "pass", "payload": None}

    async def _fake_stream(
        messages, system_prompt=None, tool_schemas=None, tool_registry=None
    ):
        yield f"data: {_json.dumps({'type': 'token', 'content': 'best effort'})}\n\n"
        yield f"data: {_json.dumps({'type': 'done', 'content': ''})}\n\n"

    with (
        patch("api.routers.query.query_gate.assess", AsyncMock(return_value=_pass)),
        patch("api.routers.query.load_skills_markdown", return_value="# skills"),
        patch("api.routers.query.get_catalogue_text", return_value=""),
        patch(
            "api.routers.query.agent_service.stream_agent_response",
            side_effect=_fake_stream,
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/query",
                json={"messages": [{"role": "user", "content": "Tell me a joke"}]},
            )

    events = _parse_sse_events(response.text)
    agent_ids = [e.get("agent_id") for e in events if e["type"] == "agent"]
    assert "clarification-agent" in agent_ids
    assert "data-extraction" in agent_ids
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_skills_config_error_emits_error_event():
    from unittest.mock import AsyncMock

    _pass = {"outcome": "pass", "payload": None}
    with (
        patch("api.routers.query.query_gate.assess", AsyncMock(return_value=_pass)),
        patch(
            "api.routers.query.load_skills_markdown",
            side_effect=SkillsConfigError("bad skills"),
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/query",
                json={"messages": [{"role": "user", "content": "Any update?"}]},
            )

    events = _parse_sse_events(response.text)
    error_events = [e for e in events if e["type"] == "error"]
    assert len(error_events) == 1
    assert "bad skills" in error_events[0]["content"]
