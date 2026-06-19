from unittest.mock import MagicMock


def test_search_uses_configured_default_n_results(monkeypatch):
    from api.services import rag_service

    collection = MagicMock()
    collection.query.return_value = {
        "documents": [["Doc text"]],
        "metadatas": [[{"source": "deck.pdf", "category": "strategy", "page": 4}]],
    }
    monkeypatch.setattr(rag_service, "_collection", collection)

    results = rag_service.search("expansion plan")

    collection.query.assert_called_once_with(
        query_texts=["expansion plan"],
        n_results=15,
    )
    assert results == [
        {
            "text": "Doc text",
            "source": "deck.pdf",
            "category": "strategy",
            "page": 4,
        }
    ]


def test_search_allows_explicit_n_results_override(monkeypatch):
    from api.services import rag_service

    collection = MagicMock()
    collection.query.return_value = {"documents": [[]], "metadatas": [[]]}
    monkeypatch.setattr(rag_service, "_collection", collection)

    rag_service.search("expansion plan", n_results=3)

    collection.query.assert_called_once_with(
        query_texts=["expansion plan"],
        n_results=3,
    )
