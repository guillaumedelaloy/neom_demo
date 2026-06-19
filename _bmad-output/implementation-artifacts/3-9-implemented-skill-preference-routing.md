# Story 3.9: Implemented-Skill Preference Routing

Status: ready-for-dev

<!-- Backend scope only — no frontend files touched -->
<!-- Depends on Story 3.6 (agent_registry.py, agents.yaml with skills + implemented flags must exist) -->

## Story

As a developer,
I want the agent router to prefer agents and skills that are currently implemented over
ones that are not, when a query could reasonably match either,
So that users get a real answer instead of a "not yet built" message whenever an implemented
skill is an adequate match — and only receive a roadmap response when no implemented skill
is close enough.

## Acceptance Criteria

1. **AC1:** `_build_agents_block()` in `agent_registry.py` produces two labelled sections in the
   router prompt: `LIVE SKILLS (implemented, available now)` and `ROADMAP SKILLS (planned, not yet
   built)`. Each section lists only the skill IDs that belong to it. An agent appears in the
   LIVE section only if it has at least one implemented skill; it appears in the ROADMAP section
   only if it has at least one non-implemented skill. An agent may appear in both sections.

2. **AC2:** `api/prompts/router.md` includes a preference instruction: the LLM must first try to
   match from LIVE SKILLS; it may only pick a ROADMAP SKILL if no LIVE SKILL adequately handles
   the query. The instruction uses concrete examples of "adequate" vs "clearly different scope".

3. **AC3:** When a query is answered by a LIVE skill that is semantically adjacent to a ROADMAP
   skill on the same agent, the router returns the LIVE skill — not the ROADMAP one. Verified by
   the test described in AC8 item (a).

4. **AC4:** When a query clearly targets a ROADMAP skill and no LIVE skill is an adequate
   substitute (e.g., "stress-test our capex assumptions" → `value-lens/financial-assumption-stress-test`
   while no LIVE skill covers stress-testing), the router is still able to return the ROADMAP skill.
   Verified by the test described in AC8 item (b).

5. **AC5:** `agent_registry.py` remains ≤120 lines. No structural changes to `route_query`,
   `AGENTS`, `_AGENT_INDEX`, `_SKILL_INDEX`, or `RoutingError` — only `_build_agents_block()`
   and the prompt text change.

6. **AC6:** `api/routers/query.py` is not modified. The `skill["implemented"]` check and all
   downstream SSE paths are unchanged.

7. **AC7:** `api/agents.yaml` is not modified. The `implemented` flag on each skill is the
   single source of truth; the router prompt derives its LIVE/ROADMAP sections from it at startup.

8. **AC8:** Tests cover:
   - **(a) Prompt structure test:** Call `_build_agents_block()` directly. Assert the returned
     string contains "LIVE SKILLS" before "ROADMAP SKILLS", that `data-retrieval/financial-lookup`
     appears in the LIVE section, and that `value-lens/value-tracking` appears in the ROADMAP section.
   - **(b) Roadmap skill still routable:** Mock `complete_chat` to return
     `{"agent_id": "value-lens", "skill_id": "financial-assumption-stress-test"}`. Assert that
     `route_query` returns `{"agent": ..., "skill": {"id": "financial-assumption-stress-test",
     "implemented": False, ...}}` — ROADMAP skills are deprioritised in the prompt but not
     stripped from routing.
   - **(c) Prompt passed to LLM has LIVE before ROADMAP:** Capture the prompt string passed to
     `complete_chat` via mock. Assert `"LIVE SKILLS"` appears before `"ROADMAP SKILLS"` in the
     full prompt string.
   - **(d) No regression:** All 48 tests from Story 3.6 continue to pass.

## Tasks / Subtasks

- [ ] T1: Update `_build_agents_block()` in `api/services/agent_registry.py` (AC: 1, 5)
  - [ ] T1.1: Collect live skills per agent: `[s for s in a.get("skills", []) if s.get("implemented")]`
  - [ ] T1.2: Collect roadmap skills per agent: non-implemented equivalent
  - [ ] T1.3: Render LIVE section header + agents with live skills (agent description + indented skill IDs)
  - [ ] T1.4: Render ROADMAP section header + agents with roadmap skills (same format)
  - [ ] T1.5: Join sections with double newline; return empty string if no skills at all (safety guard)

- [ ] T2: Update `api/prompts/router.md` (AC: 2)
  - [ ] T2.1: Add preference rule above the `{agents}` block (see Dev Notes for exact text)
  - [ ] T2.2: Output format unchanged: `{"agent_id": "<id>", "skill_id": "<id>"}` or null/null

- [ ] T3: Write tests (AC: 8)
  - [ ] T3.1: `test_prompt_structure` in `tests/test_agent_registry.py` — assert LIVE/ROADMAP sections
        and correct skill placement
  - [ ] T3.2: `test_roadmap_skill_still_routable` — mock returning non-implemented skill, assert
        `route_query` still returns it (implemented=False)
  - [ ] T3.3: `test_prompt_passed_to_llm_has_live_first` — capture prompt via mock, assert section order
  - [ ] T3.4: Run full test suite — 48 existing + 3 new = 51 total, all pass

## Dev Notes

### Why single-call preference, not two-pass routing

A two-pass approach (first LLM call with only LIVE skills, second with all skills on no-match) was
considered and rejected:

| Factor | Two-pass | Single-call preference |
|--------|----------|------------------------|
| Latency | 2× LLM calls on ambiguous queries | Zero added latency |
| Complexity | New retry logic, second prompt variant | Only `_build_agents_block()` changes |
| "Much better match" threshold | Hard to define reliably | LLM reasons naturally about adequacy |
| Failure surface | More exception paths | No new paths |

The LLM can evaluate "is a LIVE skill adequate?" in context better than a hard confidence
threshold could. Single-call with structured preference is the right trade-off.

### Current implemented skills (as of 2026-04-14)

| Agent          | LIVE skill IDs                                                    |
|----------------|-------------------------------------------------------------------|
| data-retrieval | financial-lookup, schedule-lookup, document-search                |
| risk-radar     | kpi-deviation-analysis                                            |

All other skills (delivery-engine, value-lens, gap-finder, action-desk, plus remaining
risk-radar skills) are ROADMAP.

For the vast majority of queries today, the LIVE section provides the right match. The key
ambiguity cases this story prevents:

| Query example | Wrong pre-fix | Correct post-fix |
|---------------|---------------|-----------------|
| "What's capex this year?" | value-lens/financial-assumption-stress-test | data-retrieval/financial-lookup |
| "Which KPIs are off-track?" | risk-radar/execution-readiness-check | risk-radar/kpi-deviation-analysis |
| "Show me current schedule" | delivery-engine/schedule-compression-analysis | data-retrieval/schedule-lookup |

### `_build_agents_block()` implementation

```python
def _build_agents_block() -> str:
    live_lines: list[str] = []
    roadmap_lines: list[str] = []

    for a in AGENTS:
        live_skills = [s for s in a.get("skills", []) if s.get("implemented")]
        roadmap_skills = [s for s in a.get("skills", []) if not s.get("implemented")]

        if live_skills:
            live_lines.append(f"{a['id']} — {a['description']}")
            live_lines.extend(f"  - {s['id']}" for s in live_skills)
            live_lines.append("")

        if roadmap_skills:
            roadmap_lines.append(f"{a['id']} — {a['description']}")
            roadmap_lines.extend(f"  - {s['id']}" for s in roadmap_skills)
            roadmap_lines.append("")

    sections: list[str] = []
    if live_lines:
        sections.append(
            "LIVE SKILLS (implemented, available now):\n\n"
            + "\n".join(live_lines).rstrip()
        )
    if roadmap_lines:
        sections.append(
            "ROADMAP SKILLS (planned, not yet built — only choose if no LIVE skill adequately fits):\n\n"
            + "\n".join(roadmap_lines).rstrip()
        )
    return "\n\n".join(sections)
```

### `router.md` — full updated text

```markdown
You are a query router for the NEOM CEO Cockpit.

Given a user query, identify the best agent AND the specific skill within that agent
that should handle it.
Return ONLY a JSON object on a single line — no explanation, no markdown, no code block.

**Preference rule:** Always prefer a LIVE SKILL over a ROADMAP SKILL when the live skill
adequately covers the query. A live skill is adequate if it can answer the user's specific
question, even if a roadmap skill would provide deeper analysis. Only choose a ROADMAP SKILL
when no LIVE SKILL is close enough — for example:
- "What is our capex this year?" → data-retrieval/financial-lookup (LIVE), NOT value-lens/financial-assumption-stress-test (ROADMAP)
- "Are any KPIs off-track?" → risk-radar/kpi-deviation-analysis (LIVE), NOT risk-radar/execution-readiness-check (ROADMAP)
- "Stress-test our capex assumptions against a commodity price drop" → value-lens/financial-assumption-stress-test (ROADMAP) is correct — no LIVE skill covers stress-testing

{agents}

If the query maps to an agent and skill, return: {"agent_id": "<id>", "skill_id": "<id>"}
If the query does not fit any agent or skill, return: {"agent_id": null, "skill_id": null}

User query: {query}
```

### Key behavioural properties

1. **Auto-promotes when skills go live:** Set `implemented: true` in `agents.yaml`, restart —
   the skill moves to LIVE automatically. No Python change.
2. **All skills implemented (future state):** ROADMAP section disappears entirely — no code change.
3. **Agent with no skills:** Does not appear in either section. Not routable.
4. **Token cost delta:** Agent descriptions may repeat in both sections. With 6 agents and ≤6 skills
   each, the overhead is <50 tokens — negligible.

### What NOT to touch

- `api/agents.yaml` — no changes
- `api/routers/query.py` — no changes
- `api/services/agent_service.py` — no changes
- `api/services/tools/` — no changes
- `api/services/validator_service.py` — no changes
- Any file outside `api/`

## Dev Agent Record

### Agent Model Used

_to be filled in_

### Completion Notes List

_to be filled in_

### File List

_to be filled in_

## Change Log

- 2026-04-14: Story created by claude-sonnet-4-6 as 3.9. Design: single-call preference via
  `_build_agents_block()` LIVE/ROADMAP sections + preference rule in `router.md`. Two-pass
  approach rejected — zero latency cost, simpler code surface. Only `_build_agents_block()`
  and prompt text change; `route_query`, `query.py`, and `agents.yaml` untouched.
