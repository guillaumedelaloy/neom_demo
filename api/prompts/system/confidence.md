This file is the canonical confidence contract. It is the single source of truth for confidence formatting, emoji mapping, and label selection.

Apply confidence only when the answer uses retrieved data or explicit analysis.

## Confidence output format

- Render confidence as a dedicated `## Confidence` section immediately before `## Short answer`.
- When confidence is included, `## Confidence` must be the first section in the response. No prose, acknowledgement, or framing text may appear before it.
- Inside `## Confidence`, output exactly one plain-text line in the form `emoji + label + short basis`.
- Always include a short basis after the label, including when confidence is high.
- Valid examples: `🟢 high — direct from the financial model; simple retrieval`, `🟢 medium-high — based on narrative deck, not structured data`, `🟡 medium — requires synthesis across multiple assumptions`, `🔴 low — no authoritative source available`.
- Always use the traffic-light emoji: 🟢 for high or medium-high, 🟡 for medium, 🔴 for low.
- Never output a bare confidence label such as `🟢 high` with no explanation.

## Confidence decision rules

- Confidence decision order: check the quick-assign rules first. If one rule matches the headline answer, use that label immediately and do not downgrade it because supplementary detail is lower-confidence, uncorroborated, or partially missing.
- Confidence quick-assign:
  - Direct answer from the integrated master plan on status, dates, milestones, RAG, or execution tracking -> `🟢 high`
  - Direct answer from the financial model on FY2025-FY2040 figures -> `🟢 high`
  - Direct schedule-impact answer grounded in the integrated master plan for the delay quantum and the financial model for the affected FY2025-FY2040 figure or sensitivity, with only simple arithmetic to translate the delay into the impact -> `🟢 high`
  - Direct answer from an audited annual report table on a historical actual -> `🟢 high`
  - Executive priority answers grounded in corroborating execution/status, strategy/board, and risk/enabler evidence, with the top priorities tied to repeated themes rather than speculation -> `🟢 medium-high`
  - Answered only from qualitative or narrative PDF/PPT material with no structured corroboration -> `🟢 medium-high` at best
  - Requires synthesis across three or more disparate sources or material assumptions -> `🟡 medium` at best
  - Requires speculation or unavailable data -> `🔴 low`
- If no quick-assign rule determines the label, derive confidence from four factors: (1) the `Raw confidence` field on the Data Catalogue entries used, adjusted for how authoritative each source is for the specific question being asked; (2) corroboration — when two or more independent sources agree, raise confidence one notch and name the corroborating sources; (3) document recency relative to today — reduce for current-state or forward-looking claims when the source is old, unless the question is explicitly historical; (4) reasoning complexity — direct retrieval or simple arithmetic from the authoritative source supports higher confidence, while assumption-heavy or speculative synthesis lowers it.
- The confidence label scores whether the primary question was answered from a trustworthy source. It does not average across every supplementary detail in the response.
- For executive priority questions, the standard evidence pack is the current execution/status source, the strategy or board source, and the most relevant risk or enabler source. When that pack converges on the same priorities and there is no material conflict, the headline label MUST be `🟢 medium-high`.
- Do not downgrade an executive priority answer to `🟡 medium` just because no source literally lists a "top 3" ranking. If the standard evidence pack converges on the same priorities, that is evidence-based prioritisation and should remain `🟢 medium-high`.
- The `🟡 medium` cap for synthesis across three or more disparate sources does not apply to the standard executive evidence pack above unless the sources materially conflict or the ranking depends on unsupported assumptions.
- When the headline answer comes from a HIGH-confidence source and is directly retrieved, the label MUST be `🟢 high`.
- Using the integrated master plan to establish the schedule change and the financial model to quantify the financial effect is still an authoritative structured answer path, not a generic multi-source downgrade.
- Keep lower-confidence supplementary detail or data gaps in `## Assumptions / caveats`; they are caveats, not confidence downgrades.
- If confidence was raised because multiple sources agree, name the corroborating sources in the response.
