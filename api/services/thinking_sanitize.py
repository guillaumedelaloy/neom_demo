"""Scrub model-generated thinking lines for the CEO UI (legacy tokens → NEOM wording)."""

from __future__ import annotations

import re

_SCHEDULE_SUBS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bphosphate\b", re.I), "Urban Development sector"),
    (re.compile(r"\baluminum\b", re.I), "OXAGON/SEZ sector"),
    (re.compile(r"\baluminium\b", re.I), "OXAGON/SEZ sector"),
    (re.compile(r"\bhospitality\b", re.I), "Luxury Tourism sector"),
    (re.compile(r"\bcopper\b", re.I), "Clean Energy sector"),
    (re.compile(r"\bree\b", re.I), "Digital Infrastructure sector"),
]

_BRAND_SUBS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bMa'?aden\b", re.I), "NEOM"),
    (re.compile(r"\bMaaden\b", re.I), "NEOM"),
]


def sanitize_thinking_text(text: str) -> str:
    """Replace legacy internal keys / wrong brand names in model-generated thinking bubbles."""
    if not text or not text.strip():
        return text
    out = text.strip()
    for pat, rep in _SCHEDULE_SUBS + _BRAND_SUBS:
        out = pat.sub(rep, out)
    return out
