"""Integration test to verify arithmetic tool usage in system prompt."""

from api.services.prompt_loader import load_prompt_text, render_prompt
from datetime import date


def test_system_prompt_includes_arithmetic_requirement():
    """Verify the system prompt includes mandatory arithmetic tool usage."""
    # Load the core system prompt
    core_prompt = render_prompt(
        "system/core.md", {"today_date": date.today().isoformat()}
    )

    # Check that arithmetic tool usage is mandated
    assert "arithmetic tool usage" in core_prompt
    assert "calculate tool" in core_prompt
    assert "Direct calculation in responses is strictly prohibited" in core_prompt

    # Check examples are included
    assert "sum" in core_prompt
    assert "average" in core_prompt
    assert "growth_rate" in core_prompt
    assert "percentage" in core_prompt


def test_arithmetic_examples_in_prompt():
    """Verify specific examples are provided in the system prompt."""
    core_prompt = render_prompt(
        "system/core.md", {"today_date": date.today().isoformat()}
    )

    # Check that concrete examples are provided
    assert 'operation="sum"' in core_prompt
    assert 'operation="average"' in core_prompt
    assert 'operation="growth_rate"' in core_prompt
    assert 'operation="percentage"' in core_prompt
