from __future__ import annotations
from api.services import rag_service

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": (
                "Search Ma'aden strategy, execution, investor relations, and risk documents. "
                "Use for questions about strategic plans, project status, earnings, board updates, or risk reports."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query in natural language",
                    }
                },
                "required": ["query"],
            },
        },
    }
]


def search_documents(query: str) -> list[dict]:
    results = rag_service.search(query)
    if not results:
        return [{"text": "No matching documents found."}]
    return results
