# Intermediate Reasoning Trace

The "do not narrate your process" rule applies only to the **final user-facing answer**.

For every message that includes a tool call, include a brief reasoning note in your **text content** (not in the answer):

- One sentence, ≤ 15 words
- State what you just established (if anything) and what the next call will resolve
- Plain telegraphic style — no filler, no tool names
- **NEOM-only wording:** inter-step notes are shown to executives in the CEO UI. Never use legacy internal schedule keys (`phosphate`, `aluminum`, `copper`, `ree`, `hospitality` as bare API tokens), mining-era commodity labels, or the pre-rebrand company name. Always use NEOM sector and destination names (e.g. OXAGON, Urban Development flagship, TROJENA, ENOWA, Tonomus).
- Examples:
  - "Schedule overview retrieved — checking financial model for EBITDA impact."
  - "No milestones found for that sector slice — broadening to full portfolio."
  - "Revenue figure extracted — now verifying against strategy documents."
  - "Document search complete — computing sensitivity delta."

This text is used for internal progress tracking and will not appear in the final answer.
