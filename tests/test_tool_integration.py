"""Test that arithmetic tool is properly integrated into the agent's tool set."""

import json
from api.services.tools import TOOL_SCHEMAS, TOOL_REGISTRY
from api.services.prompt_loader import load_prompt_text


def test_arithmetic_tool_in_schemas():
    """Verify arithmetic tool is in the global tool schemas."""
    tool_names = [schema["function"]["name"] for schema in TOOL_SCHEMAS]
    assert "calculate" in tool_names

    # Find the arithmetic tool
    arithmetic_schema = next(
        s for s in TOOL_SCHEMAS if s["function"]["name"] == "calculate"
    )

    # Verify it's marked as mandatory
    assert "MANDATORY" in arithmetic_schema["function"]["description"]

    # Verify all operations are listed
    operations = arithmetic_schema["function"]["parameters"]["properties"]["operation"][
        "enum"
    ]
    expected_ops = [
        "sum",
        "subtract",
        "multiply",
        "divide",
        "percentage",
        "growth_rate",
        "average",
        "min",
        "max",
    ]
    assert set(operations) == set(expected_ops)


def test_arithmetic_tool_in_registry():
    """Verify arithmetic tool function is in the registry."""
    assert "calculate" in TOOL_REGISTRY
    assert callable(TOOL_REGISTRY["calculate"])


def test_skills_catalog_mentions_calculate():
    """Verify the skills catalog includes calculate tool guidance."""
    catalog = load_prompt_text("skills/catalog.md")

    # Check that calculate is mentioned
    assert "`calculate`" in catalog
    assert "MANDATORY" in catalog
    assert "arithmetic operations" in catalog


def test_initial_prompt_mentions_arithmetic():
    """Verify initial turn prompt includes arithmetic guidance."""
    initial = load_prompt_text("system/initial.md")

    # Check that arithmetic operations are mentioned
    assert "arithmetic operations" in initial
    assert "`calculate` tool" in initial
    assert "no manual calculations" in initial


def test_agent_can_access_all_tools():
    """Verify the agent service would receive all tools including arithmetic."""
    # Import here to avoid circular imports
    from api.services.agent_service import stream_agent_response

    # When no tool_schemas are provided, it should use global TOOL_SCHEMAS
    # which includes our arithmetic tool
    assert len(TOOL_SCHEMAS) > 5  # Should have at least 6 tools now

    # Verify calculate is among them
    calculate_schema = next(
        (s for s in TOOL_SCHEMAS if s["function"]["name"] == "calculate"), None
    )
    assert calculate_schema is not None


def test_tool_description_quality():
    """Verify the arithmetic tool has high-quality descriptions."""
    arithmetic_schema = next(
        s for s in TOOL_SCHEMAS if s["function"]["name"] == "calculate"
    )

    # Main description should be clear about when to use
    desc = arithmetic_schema["function"]["description"]
    assert len(desc) > 50  # Should be descriptive
    assert "sums" in desc
    assert "averages" in desc
    assert "growth rates" in desc

    # Parameter descriptions should be helpful
    params = arithmetic_schema["function"]["parameters"]["properties"]
    assert len(params["operation"]["description"]) > 20
    assert "old/base value" in params["a"]["description"]  # Clarifies growth_rate usage
    assert "new value" in params["b"]["description"]


if __name__ == "__main__":
    print("Running integration tests...")
    test_arithmetic_tool_in_schemas()
    print("✓ Arithmetic tool in schemas")

    test_arithmetic_tool_in_registry()
    print("✓ Arithmetic tool in registry")

    test_skills_catalog_mentions_calculate()
    print("✓ Skills catalog updated")

    test_initial_prompt_mentions_arithmetic()
    print("✓ Initial prompt updated")

    test_agent_can_access_all_tools()
    print("✓ Agent can access arithmetic tool")

    test_tool_description_quality()
    print("✓ Tool descriptions are high quality")

    print("\nAll integration tests passed! ✨")
