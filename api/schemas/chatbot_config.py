"""Pydantic model for chatbot configuration loaded from YAML."""

from pathlib import Path

import yaml
from pydantic import BaseModel, Field

_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "config.yml"


class ChatbotConfig(BaseModel):
    """Chatbot configuration read from api/config/config.yml."""

    model: str = "anthropic/claude-3-5-sonnet-20241022"
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)
    max_rounds: int = Field(default=30, ge=1)
    pressure_soft_pct: int = Field(default=60, ge=0, le=100)
    pressure_medium_pct: int = Field(default=80, ge=0, le=100)
    pressure_hard_pct: int = Field(default=100, ge=0, le=100)
    rag_n_results: int = Field(default=15, ge=1)


def load_config(path: Path = _CONFIG_PATH) -> ChatbotConfig:
    """Load chatbot configuration from a YAML file.

    Falls back to defaults when the file is missing or empty.
    """
    if path.exists():
        with open(path) as f:
            data = yaml.safe_load(f) or {}
        return ChatbotConfig(**data)
    return ChatbotConfig()
