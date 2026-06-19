from unittest.mock import AsyncMock, patch

import pytest

from api.services import query_gate


@pytest.mark.asyncio
async def test_query_gate_keeps_executive_priority_question_in_scope():
    fake_gate_reply = '{"outcome": "pass", "payload": null}'

    with patch(
        "api.services.query_gate.llm_client.complete_chat",
        AsyncMock(return_value=fake_gate_reply),
    ) as complete_chat:
        result = await query_gate.assess(
            [
                {
                    "role": "user",
                    "content": "If I had only 3 priorities at Maaden today what would they be to realize the strategy?",
                }
            ]
        )

    assert result == {"outcome": "pass", "payload": None}
    gate_messages = complete_chat.await_args.args[0]
    assert (
        "If I had only 3 priorities at Maaden today what would they be to realize the strategy?"
        in gate_messages[0]["content"]
    )
