from __future__ import annotations
import logging
import os
import shutil
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
from api.schemas.chatbot_config import load_config

logger = logging.getLogger(__name__)
_CFG = load_config()

REPO_ROOT = Path(__file__).parent.parent.parent
_GCS_CHROMA = REPO_ROOT / "data_extract" / "chroma_db"
_LOCAL_CHROMA = Path("/tmp/chroma_db_local")


def _ensure_local_copy() -> Path | None:
    """Copy chroma_db from GCS FUSE mount to local disk on Cloud Run Instance.

    SQLite is incompatible with GCS FUSE (stale file handles, journal errors).
    A local copy avoids this entirely. ~84 MB, takes a few seconds at startup.
    """
    if not _GCS_CHROMA.exists():
        return None
    if _LOCAL_CHROMA.exists():
        shutil.rmtree(_LOCAL_CHROMA)
    shutil.copytree(_GCS_CHROMA, _LOCAL_CHROMA)
    logger.info("Copied ChromaDB to local disk: %s", _LOCAL_CHROMA)
    return _LOCAL_CHROMA


def _load_collection() -> chromadb.Collection | None:
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not set — RAG search disabled")
        return None
    ef = OpenAIEmbeddingFunction(
        api_key=os.environ["OPENAI_API_KEY"],
        model_name="text-embedding-3-small",
    )
    chroma_path = _ensure_local_copy()
    if chroma_path is None:
        logger.warning(
            "ChromaDB not found at %s — run scripts/build_rag_index.py first",
            _GCS_CHROMA,
        )
        return None
    try:
        client = chromadb.PersistentClient(path=str(chroma_path))
        return client.get_collection("neom_docs", embedding_function=ef)
    except Exception as exc:
        logger.warning("Could not load RAG collection: %s", exc)
        return None


_collection: chromadb.Collection | None = _load_collection()


def search(query: str, n_results: int | None = None) -> list[dict]:
    """Return top-n chunks matching query; empty list when collection unavailable."""
    if _collection is None:
        return []
    try:
        results = _collection.query(
            query_texts=[query], n_results=n_results or _CFG.rag_n_results
        )
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        return [
            {
                "text": doc,
                "source": meta.get("source", ""),
                "category": meta.get("category", ""),
                "page": meta.get("page", 0),
            }
            for doc, meta in zip(docs, metas)
        ]
    except Exception as exc:
        logger.warning("RAG search failed: %s", exc)
        return []
