from pathlib import Path

import yaml

from api.schemas.chatbot_config import load_config


def test_load_config_uses_new_defaults_when_file_missing(tmp_path: Path):
    cfg = load_config(tmp_path / "missing.yml")

    assert cfg.max_rounds == 30
    assert cfg.pressure_soft_pct == 60
    assert cfg.pressure_medium_pct == 80
    assert cfg.pressure_hard_pct == 100
    assert cfg.rag_n_results == 15


def test_load_config_reads_agent_budget_and_rag_settings(tmp_path: Path):
    config_path = tmp_path / "config.yml"
    config_path.write_text(
        yaml.safe_dump(
            {
                "max_rounds": 42,
                "pressure_soft_pct": 25,
                "pressure_medium_pct": 50,
                "pressure_hard_pct": 75,
                "rag_n_results": 9,
            }
        ),
        encoding="utf-8",
    )

    cfg = load_config(config_path)

    assert cfg.max_rounds == 42
    assert cfg.pressure_soft_pct == 25
    assert cfg.pressure_medium_pct == 50
    assert cfg.pressure_hard_pct == 75
    assert cfg.rag_n_results == 9
