"""Canonical NEOM sector names for IMP schedule bundles (legacy JSON keys on disk)."""

from __future__ import annotations

# Public API bundle keys (get_bu_schedule enum) → executive-facing NEOM line (never commodity names)
SCHEDULE_KEY_TO_NEOM_LABEL: dict[str, str] = {
    "phosphate": "Urban Development & Smart Communities",
    "aluminum": "Special Economic Zone & Investment Platform (OXAGON)",
    "hospitality": "Luxury Tourism & Hospitality",
    "copper": "Clean Energy & Green Industry",
    "ree": "Digital Infrastructure & AI",
    "gold": "Luxury Tourism & Hospitality",
}

# Stable ordering for schedule_overview dict (portfolio summaries)
SECTOR_OVERVIEW_ORDER: tuple[str, ...] = (
    "Urban Development & Smart Communities",
    "Special Economic Zone & Investment Platform (OXAGON)",
    "Luxury Tourism & Hospitality",
    "Clean Energy & Green Industry",
    "Digital Infrastructure & AI",
)


def api_bundle_from_internal_disk_key(internal: str) -> str:
    """schedules.json `bus` keys use `gold`; API / enum use `hospitality`."""
    b = (internal or "").strip().lower()
    if b == "gold":
        return "hospitality"
    return b


def neom_label_for_schedule_key(bundle: str) -> str:
    """Map API bundle key or internal disk key to the canonical NEOM sector string."""
    b = (bundle or "").strip().lower()
    b = api_bundle_from_internal_disk_key(b)
    return SCHEDULE_KEY_TO_NEOM_LABEL.get(b, b or "portfolio")
