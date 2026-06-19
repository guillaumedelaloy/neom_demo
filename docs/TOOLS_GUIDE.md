# Tools Guide for Maaden AI Copilot

This guide explains how tools are implemented and exposed to the AI agent in this codebase.

## Tool Implementation Pattern

### 1. Create a Tool Module

Each tool module (e.g., `api/services/tools/arithmetic_tools.py`) should:

```python
# Define the tool function(s)
def calculate(operation: str, values: list[float] = None, ...):
    """Perform arithmetic calculations."""
    # Implementation
    return {"result": result, "error": None}

# Export tool schemas in OpenAI function-calling format
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Clear description of when/how to use this tool",
            "parameters": {
                "type": "object",
                "properties": {
                    # Parameter definitions with descriptions
                },
                "required": ["operation"]
            }
        }
    }
]
```

### 2. Register in Tool Registry

Update `api/services/tools/__init__.py`:

```python
from api.services.tools.arithmetic_tools import (
    TOOL_SCHEMAS as _ARITHMETIC_SCHEMAS,
    calculate,
)

# Add to aggregated schemas
TOOL_SCHEMAS = ... + _ARITHMETIC_SCHEMAS

# Add to registry
TOOL_REGISTRY = {
    # ...
    "calculate": calculate,
}
```

### 3. Update Prompt Guidance

The agent learns about tools through:

#### a) Skills Catalog (`api/prompts/skills/catalog.md`)
Add a line describing when to use your tool:
```markdown
- `calculate`: MANDATORY for all arithmetic operations (sum, average, growth rates, percentages, etc.). Direct calculation is prohibited.
```

#### b) System Prompts (`api/prompts/system/initial.md`)
Add specific guidance if the tool has special usage patterns:
```markdown
- All arithmetic operations: MUST use `calculate` tool (no manual calculations allowed).
```

#### c) Core System Prompt (`api/prompts/system/core.md`)
For critical requirements (like mandatory arithmetic), add explicit rules:
```markdown
Mandatory arithmetic tool usage:
- ALL arithmetic operations MUST use the calculate tool - no exceptions.
- Direct calculation in responses is strictly prohibited.
```

## How the Agent Discovers Tools

1. **Tool Schemas**: The LLM receives the complete `TOOL_SCHEMAS` list with each request
2. **Tool Descriptions**: The `description` field in each schema tells the LLM when to use the tool
3. **Prompt Guidance**: System prompts provide explicit instructions about tool usage patterns
4. **Examples**: Including examples in prompts helps the LLM understand proper usage

## Best Practices

### Tool Design
- Make tool names clear and action-oriented (`calculate`, not `math`)
- Write descriptive `description` fields that explain WHEN to use the tool
- Include parameter descriptions that clarify expected values
- Return structured responses with error handling

### Tool Descriptions
Good example:
```json
"description": "Perform arithmetic calculations. MANDATORY for all numeric operations including: sums, averages, growth rates, percentages, and any mathematical calculations. Direct calculation in responses is prohibited."
```

This description:
- States it's MANDATORY (catches LLM attention)
- Lists specific use cases
- Explicitly prohibits the alternative (direct calculation)

### Integration Testing
Always test:
1. Tool appears in `TOOL_SCHEMAS`
2. Tool function is in `TOOL_REGISTRY`
3. Prompt guidance mentions the tool
4. Tool schema is well-formed
5. Error cases are handled gracefully

## Tool Execution Flow

1. User asks a question requiring calculation
2. LLM sees the `calculate` tool in its available tools
3. LLM reads system prompt saying arithmetic MUST use this tool  
4. LLM generates a tool call: `{"name": "calculate", "arguments": {...}}`
5. Agent service looks up `calculate` in `TOOL_REGISTRY`
6. Executes the function with provided arguments
7. Returns result to LLM for final response formatting

## Debugging Tools

To see all available tools:
```python
from api.services.tools import TOOL_SCHEMAS
for tool in TOOL_SCHEMAS:
    print(f"- {tool['function']['name']}: {tool['function']['description'][:60]}...")
```

To test a tool directly:
```python
from api.services.tools import TOOL_REGISTRY
result = TOOL_REGISTRY["calculate"](operation="sum", values=[1, 2, 3])
print(result)  # {"result": 6, "error": None}
```