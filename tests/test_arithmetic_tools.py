"""Tests for arithmetic tools to ensure correct calculations and error handling."""

import pytest
from api.services.tools.arithmetic_tools import calculate, TOOL_SCHEMAS


class TestCalculateFunction:
    """Test the calculate function for all operations."""

    def test_sum_operation(self):
        """Test sum with various inputs."""
        result = calculate("sum", values=[1, 2, 3, 4, 5])
        assert result["result"] == 15
        assert result["error"] is None

        # Test with floats
        result = calculate("sum", values=[1.5, 2.5, 3.0])
        assert result["result"] == 7.0

        # Test with empty list
        result = calculate("sum", values=[])
        assert result["result"] == 0

        # Test with no values
        result = calculate("sum")
        assert result["result"] is None
        assert "No values provided" in result["error"]

    def test_average_operation(self):
        """Test average calculation."""
        result = calculate("average", values=[10, 20, 30])
        assert result["result"] == 20.0

        # Test precision
        result = calculate("average", values=[1, 2], precision=3)
        assert result["result"] == 1.5

        # Test with single value
        result = calculate("average", values=[42])
        assert result["result"] == 42.0

        # Test empty list
        result = calculate("average", values=[])
        assert result["result"] is None
        assert "Empty list" in result["error"]

    def test_min_max_operations(self):
        """Test min and max operations."""
        values = [5, 2, 8, 1, 9, 3]

        result = calculate("min", values=values)
        assert result["result"] == 1

        result = calculate("max", values=values)
        assert result["result"] == 9

        # Test with negative numbers
        result = calculate("min", values=[-5, -2, -8])
        assert result["result"] == -8

    def test_binary_operations(self):
        """Test subtract, multiply, divide operations."""
        # Subtraction
        result = calculate("subtract", a=10, b=3)
        assert result["result"] == 7

        # Multiplication
        result = calculate("multiply", a=4, b=5)
        assert result["result"] == 20

        # Division
        result = calculate("divide", a=20, b=4)
        assert result["result"] == 5.0

        # Division with precision
        result = calculate("divide", a=10, b=3, precision=4)
        assert result["result"] == 3.3333

    def test_percentage_operation(self):
        """Test percentage calculation (a as percentage of b)."""
        result = calculate("percentage", a=25, b=100)
        assert result["result"] == 25.0

        result = calculate("percentage", a=50, b=200)
        assert result["result"] == 25.0

        # Test with decimals
        result = calculate("percentage", a=1.5, b=10, precision=1)
        assert result["result"] == 15.0

    def test_growth_rate_operation(self):
        """Test growth rate calculation."""
        # Positive growth
        result = calculate("growth_rate", a=100, b=150)
        assert result["result"] == 50.0

        # Negative growth
        result = calculate("growth_rate", a=100, b=80)
        assert result["result"] == -20.0

        # Large growth
        result = calculate("growth_rate", a=10, b=100)
        assert result["result"] == 900.0

    def test_error_handling(self):
        """Test error scenarios."""
        # Division by zero
        result = calculate("divide", a=10, b=0)
        assert result["result"] is None
        assert "Division by zero" in result["error"]

        # Percentage with zero denominator
        result = calculate("percentage", a=10, b=0)
        assert result["result"] is None
        assert "zero" in result["error"].lower()

        # Growth rate from zero base
        result = calculate("growth_rate", a=0, b=100)
        assert result["result"] is None
        assert "zero base" in result["error"].lower()

        # Missing required parameters
        result = calculate("subtract", a=10)
        assert result["result"] is None
        assert "Both a and b required" in result["error"]

        # Unknown operation
        result = calculate("unknown_op")
        assert result["result"] is None
        assert "Unknown operation" in result["error"]

    def test_precision_handling(self):
        """Test precision parameter across operations."""
        # Default precision (2)
        result = calculate("divide", a=10, b=3)
        assert result["result"] == 3.33

        # Custom precision
        result = calculate("divide", a=10, b=3, precision=5)
        assert result["result"] == 3.33333

        # Zero precision
        result = calculate("divide", a=10, b=3, precision=0)
        assert result["result"] == 3.0


class TestToolSchema:
    """Test the tool schema is correctly defined."""

    def test_schema_structure(self):
        """Verify the schema follows OpenAI function calling format."""
        assert len(TOOL_SCHEMAS) == 1
        schema = TOOL_SCHEMAS[0]

        assert schema["type"] == "function"
        assert "function" in schema
        assert schema["function"]["name"] == "calculate"
        assert "description" in schema["function"]
        assert "parameters" in schema["function"]

    def test_schema_parameters(self):
        """Verify all parameters are correctly defined."""
        params = TOOL_SCHEMAS[0]["function"]["parameters"]
        properties = params["properties"]

        assert "operation" in properties
        assert properties["operation"]["type"] == "string"
        assert "enum" in properties["operation"]

        # Check all operations are in enum
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
        assert all(op in properties["operation"]["enum"] for op in expected_ops)

        assert "values" in properties
        assert "a" in properties
        assert "b" in properties
        assert "precision" in properties

        # Only operation is required
        assert params["required"] == ["operation"]


class TestIntegration:
    """Test integration with the tool registry."""

    def test_tool_registered(self):
        """Verify the calculate tool is properly registered."""
        from api.services.tools import TOOL_REGISTRY, TOOL_SCHEMAS

        # Check function is in registry
        assert "calculate" in TOOL_REGISTRY
        assert TOOL_REGISTRY["calculate"] == calculate

        # Check schema is included
        arithmetic_schema = next(
            (s for s in TOOL_SCHEMAS if s["function"]["name"] == "calculate"), None
        )
        assert arithmetic_schema is not None
        assert "MANDATORY" in arithmetic_schema["function"]["description"]
