"""Arithmetic tools for mandatory calculations in the NEOM AI copilot.

All arithmetic operations (sums, growth rates, averages, etc.) must use these tools.
Direct calculations in responses are prohibited by system prompt.
"""

from typing import List, Union, Optional, Dict, Any


def calculate(
    operation: str,
    values: Optional[List[float]] = None,
    a: Optional[float] = None,
    b: Optional[float] = None,
    precision: int = 2,
) -> Dict[str, Any]:
    """Perform arithmetic calculations with consistent precision and error handling.

    Args:
        operation: Type of calculation (sum, subtract, multiply, divide, percentage,
                  growth_rate, average, min, max)
        values: List of numbers for operations like sum, average, min, max
        a: First number for binary operations
        b: Second number for binary operations
        precision: Decimal places for rounding (default: 2)

    Returns:
        Dict with 'result' (float or None) and 'error' (str or None)
    """
    try:
        if operation == "sum":
            if values is None:
                return {"result": None, "error": "No values provided for sum"}
            if len(values) == 0:
                # Empty list sums to 0
                result = 0
            else:
                result = sum(values)

        elif operation == "average":
            if values is None:
                return {"result": None, "error": "No values provided for average"}
            if len(values) == 0:
                return {"result": None, "error": "Empty list provided for average"}
            result = sum(values) / len(values)

        elif operation == "min":
            if not values:
                return {"result": None, "error": "No values provided for min"}
            if len(values) == 0:
                return {"result": None, "error": "Empty list provided"}
            result = min(values)

        elif operation == "max":
            if not values:
                return {"result": None, "error": "No values provided for max"}
            if len(values) == 0:
                return {"result": None, "error": "Empty list provided"}
            result = max(values)

        elif operation == "subtract":
            if a is None or b is None:
                return {
                    "result": None,
                    "error": "Both a and b required for subtraction",
                }
            result = a - b

        elif operation == "multiply":
            if a is None or b is None:
                return {
                    "result": None,
                    "error": "Both a and b required for multiplication",
                }
            result = a * b

        elif operation == "divide":
            if a is None or b is None:
                return {"result": None, "error": "Both a and b required for division"}
            if b == 0:
                return {"result": None, "error": "Division by zero"}
            result = a / b

        elif operation == "percentage":
            # Calculate what percentage a is of b
            if a is None or b is None:
                return {"result": None, "error": "Both a and b required for percentage"}
            if b == 0:
                return {
                    "result": None,
                    "error": "Cannot calculate percentage with denominator of zero",
                }
            result = (a / b) * 100

        elif operation == "growth_rate":
            # Calculate percentage change from a (old) to b (new)
            if a is None or b is None:
                return {
                    "result": None,
                    "error": "Both a (old value) and b (new value) required for growth rate",
                }
            if a == 0:
                return {
                    "result": None,
                    "error": "Cannot calculate growth rate from zero base",
                }
            result = ((b - a) / a) * 100

        else:
            return {"result": None, "error": f"Unknown operation: {operation}"}

        # Round to specified precision
        result = round(result, precision)
        return {"result": result, "error": None}

    except Exception as e:
        return {"result": None, "error": f"Calculation error: {str(e)}"}


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": (
                "Perform arithmetic calculations. MANDATORY for all numeric operations including: "
                "sums, averages, growth rates, percentages, and any mathematical calculations. "
                "Direct calculation in responses is prohibited."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "enum": [
                            "sum",
                            "subtract",
                            "multiply",
                            "divide",
                            "percentage",
                            "growth_rate",
                            "average",
                            "min",
                            "max",
                        ],
                        "description": (
                            "Type of calculation. Use 'percentage' for 'a as % of b', "
                            "'growth_rate' for '% change from a to b'."
                        ),
                    },
                    "values": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "List of numbers for sum, average, min, or max operations.",
                    },
                    "a": {
                        "type": "number",
                        "description": (
                            "First number for binary operations. For growth_rate, this is the old/base value."
                        ),
                    },
                    "b": {
                        "type": "number",
                        "description": (
                            "Second number for binary operations. For growth_rate, this is the new value."
                        ),
                    },
                    "precision": {
                        "type": "integer",
                        "description": "Decimal places for rounding (default: 2).",
                    },
                },
                "required": ["operation"],
            },
        },
    },
]
