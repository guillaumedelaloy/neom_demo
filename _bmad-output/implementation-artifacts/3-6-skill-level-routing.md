# Story 3.6: Skill-Level Routing

Status: done

<!-- Backend scope only — no frontend files touched -->
<!-- Depends on Story 3.4 (agent_registry.py, agents.yaml, router.md must exist) -->

## Story

As a developer,
I want the router to resolve both the agent and the specific skill needed to answer a query in a single LLM call, check whether that skill is implemented before proceeding, and emit the matched agent's identity as the first event in the SSE stream,
So that capability is tracked at the skill level and the frontend always knows which agent is answering — enabling the UI to present the response as coming from that specific agent.

## Acceptance Criteria

1. **AC1:** Each agent entry in `api/agents.yaml` gains a `skills` list. Each skill has `id`, `description`, and `implemented: false`. All skills start as not implemented.

2. **AC2:** `api/prompts/router.md` is updated to return `{"agent_id": "<id>", "skill_id": "<id>"}` or `{"agent_id": null, "skill_id": null}` in a single call — agent and skill resolved together, no second LLM round-trip.

3. **AC3:** `agent_registry.py` builds a `_SKILL_INDEX: dict[str, dict]` mapping `"agent_id/skill_id"` to skill dicts at startup. `route_query` returns `{"agent": {...}, "skill": {...}}` or `None`.

4. **AC4:** When routing returns a match but `skill["implemented"]` is `false`, `query.py` emits a structured `not_supported` response that names the skill, states it is not yet built, and lists any skills in that agent that ARE implemented (so the user knows what they can ask instead).

5. **AC5:** When routing returns a match and `skill["implemented"]` is `true`, the pipeline continues to the validator and then `stream_agent_response` unchanged.

6. **AC6:** When routing returns `None` (no agent/skill match), behaviour is unchanged from Story 3.4 — `build_out_of_scope_message()` is emitted.

7. **AC7:** No second LLM call is added — the single router call resolves both agent and skill.

8. **AC8:** When a matched agent proceeds to streaming, the first SSE event emitted is `{"type": "agent", "agent_id": "<id>", "content": "<label>"}` — before any token events. This event is not emitted on `not_supported` paths.

9. **AC9:** `agent_registry.py` remains ≤80 lines. No files outside `api/` are touched.

10. **AC10:** Tests cover: matched implemented skill proceeds to validator, matched unimplemented skill emits `not_supported` with skill name, no-match still emits out-of-scope message, `_SKILL_INDEX` correctly keyed, `agent` event is first event in a successful stream.

## Tasks / Subtasks

- [x] T1: Update `api/agents.yaml` — add `skills` to all five agents (AC: 1)
  - [x] T1.1: Add skills list to each agent (see Dev Notes for exact content)
  - [x] T1.2: All skills set `implemented: false` (except `risk-radar/kpi-deviation-analysis` which is `true`)

- [x] T2: Update `api/prompts/router.md` — skill-aware routing (AC: 2)
  - [x] T2.1: Add skill descriptions to the prompt and update return format (see Dev Notes)

- [x] T3: Update `api/services/agent_registry.py` (AC: 3)
  - [x] T3.1: Build `_SKILL_INDEX` at startup: `{"risk-radar/kpi-deviation-analysis": {...}, ...}`
  - [x] T3.2: Update `route_query` return type: `{"agent": dict, "skill": dict}` or `None`

- [x] T4: Update `api/routers/query.py` (AC: 4, 5, 6)
  - [x] T4.1: Update routing result handling — unpack `agent` and `skill` from result
  - [x] T4.2: Add skill implementation check — if `not skill["implemented"]`, emit structured `not_supported`
  - [x] T4.3: Implemented skill path: continue to validator with `agent["system_prompt"]` unchanged

- [x] T5: Write tests (AC: 10)
  - [x] T5.1: Update `tests/test_agent_registry.py` — test `_SKILL_INDEX` keying, `route_query` return shape
  - [x] T5.2: Update `tests/test_query_routing.py` — unimplemented skill emits `not_supported`; implemented skill: `agent` event is first, followed by tokens

- [x] T6: Run full test suite — all pass, no regressions

## Dev Notes

### Why agent is a UI concept

The agent label (Risk Radar, Value Lens etc.) is a grouping that helps the user understand what kind of question they're asking. The actual unit of work is the skill. Two skills from different agents could in theory share the same tool calls — the agent layer just sets the frame for the conversation. This story makes that explicit by routing to the skill, not the agent.

### Updated `api/agents.yaml` — skills added

```yaml
- id: risk-radar
  label: "Risk Radar"
  description: "Risk & Resilience Agent — identifies, prioritizes, and stress-tests threats to value delivery across the strategy execution portfolio, including execution readiness, timeline credibility, technical, operational, talent, and macro risks."
  confidence_level: green
  system_prompt: |
    You are Risk Radar, the Risk & Resilience Agent for the NEOM CEO Cockpit.
    Your role is to identify, prioritize, and stress-test threats to value delivery
    across the full strategy execution portfolio — covering execution readiness,
    timeline credibility, technical, operational, talent, and macro risks.
    Always call the available KPI tools before responding.
    Highlight any KPIs with status 'at_risk' or 'off_track'.
    Never fabricate numbers — only cite values returned by tools.
    If data is insufficient to assess a risk, say so explicitly.
  skills:
    - id: kpi-deviation-analysis
      description: "Identifies which KPIs are currently at-risk or off-track and quantifies the deviation from plan."
      implemented: false
    - id: timeline-credibility-assessment
      description: "Assesses whether project timelines are realistic based on current execution pace."
      implemented: false
    - id: execution-readiness-check
      description: "Evaluates whether teams and resources are ready to execute planned initiatives."
      implemented: false
    - id: operational-risk-analysis
      description: "Surfaces operational risks including process, supply chain, and site-level threats."
      implemented: false
    - id: talent-risk-analysis
      description: "Identifies people and capability gaps that threaten strategy execution."
      implemented: false
    - id: macro-risk-analysis
      description: "Assesses macro-level risks including commodity prices, geopolitics, and regulatory changes."
      implemented: false

- id: delivery-engine
  label: "Delivery Engine"
  description: "Execution Velocity Agent — assesses whether the portfolio is moving fast enough and surfaces levers to accelerate or resequence initiatives, including schedule compression, technology deployment pace, hiring pace, and modular delivery opportunities."
  confidence_level: green
  system_prompt: |
    You are Delivery Engine, the Execution Velocity Agent for the NEOM CEO Cockpit.
    Your role is to assess whether the portfolio is moving fast enough and surface
    specific levers to accelerate or resequence initiatives — including schedule
    compression, technology deployment pace, hiring pace, and modular delivery.
    Call KPI tools to retrieve schedule and execution data before responding.
    Cite specific milestones, dates, and velocity metrics from tool results.
    Never fabricate dates or progress figures.
  skills:
    - id: schedule-compression-analysis
      description: "Identifies opportunities to compress project schedules without sacrificing quality or safety."
      implemented: false
    - id: portfolio-resequencing
      description: "Evaluates whether initiative sequencing should be changed to maximise delivery velocity."
      implemented: false
    - id: technology-deployment-pace
      description: "Assesses how fast technology initiatives are being deployed versus plan."
      implemented: false
    - id: hiring-pace-assessment
      description: "Evaluates whether hiring is keeping pace with execution requirements."
      implemented: false
    - id: modular-delivery-opportunities
      description: "Surfaces opportunities to break initiatives into smaller deliverable modules."
      implemented: false

- id: value-lens
  label: "Value Lens"
  description: "Financial Impact Agent — tracks whether the portfolio is generating expected value, stress-tests financial assumptions, optimizes capital allocation, models commercial and product portfolio scenarios, and monitors the economics of operational excellence and exploration."
  confidence_level: amber
  system_prompt: |
    You are Value Lens, the Financial Impact Agent for the NEOM CEO Cockpit.
    Your role is to track whether the portfolio is generating expected value,
    stress-test financial assumptions, optimize capital allocation, model commercial
    and product portfolio scenarios, and monitor the economics of operational
    excellence and exploration.
    Always call the available KPI tools before responding.
    Compare actuals to plan and highlight variances with quantified impact.
    Never fabricate financial figures — only cite values returned by tools.
    Clearly note where the financial modelling engine is not yet fully trained.
  skills:
    - id: value-tracking
      description: "Tracks whether the portfolio is generating expected financial value vs. plan."
      implemented: false
    - id: financial-assumption-stress-test
      description: "Stress-tests key financial assumptions underlying the strategy."
      implemented: false
    - id: capital-allocation-optimization
      description: "Analyses whether capital is allocated to highest-value initiatives."
      implemented: false
    - id: commercial-scenario-modelling
      description: "Models the financial impact of commercial scenarios such as price changes or demand shifts."
      implemented: false
    - id: operational-economics-monitoring
      description: "Monitors the unit economics of operational excellence initiatives."
      implemented: false

- id: gap-finder
  label: "Gap Finder"
  description: "White Spot & Decision Intelligence Agent — surfaces what is not being tracked, asked, or decided, including gaps against board commitments, planning quality, talent gaps, technology readiness, exploration pipeline gaps, and strategic coverage gaps."
  confidence_level: amber
  system_prompt: |
    You are Gap Finder, the White Spot & Decision Intelligence Agent for the NEOM CEO Cockpit.
    Your role is to surface what is not being tracked, not being asked, and not being
    decided — including gaps against board commitments, planning quality, talent gaps,
    technology readiness and adoption gaps, exploration pipeline gaps, and strategic
    coverage gaps.
    Call KPI tools to retrieve current performance data before responding.
    Identify and quantify gaps between actuals and commitments using tool data only.
    Clearly note where gap analysis coverage is not yet fully trained.
  skills:
    - id: board-commitment-gap-analysis
      description: "Identifies gaps between current trajectory and commitments made to the board."
      implemented: false
    - id: planning-quality-assessment
      description: "Evaluates the quality and completeness of strategic and operational plans."
      implemented: false
    - id: talent-gap-identification
      description: "Surfaces people and capability gaps not yet reflected in hiring or development plans."
      implemented: false
    - id: technology-readiness-gap
      description: "Identifies technology adoption and readiness gaps versus strategy requirements."
      implemented: false
    - id: exploration-pipeline-gap
      description: "Surfaces gaps in the exploration pipeline relative to long-term resource targets."
      implemented: false
    - id: strategic-coverage-gap
      description: "Identifies strategic themes or decisions that are not yet being tracked or addressed."
      implemented: false

- id: action-desk
  label: "Action Desk"
  description: "Action & Accountability Agent — converts insights into owned, time-bound actions; tracks whether commitments are being met; enables initiative-level root cause drill-down; and maintains session memory for meeting-to-meeting continuity."
  confidence_level: red
  system_prompt: |
    You are Action Desk, the Action & Accountability Agent for the NEOM CEO Cockpit.
    Your role is to convert insights into owned, time-bound actions, track whether
    commitments are being met, enable initiative-level root cause drill-down, and
    maintain continuity across sessions.
    Call KPI tools first to ground recommendations in current performance data.
    Structure every response as: situation → recommended action → owner → timeline → success metric.
    Clearly state this is a Phase 2 capability — the full accountability tracking
    and session memory engine is not yet built.
  skills:
    - id: action-conversion
      description: "Converts analytical insights into concrete, owned, time-bound actions."
      implemented: false
    - id: commitment-tracking
      description: "Tracks whether previously agreed actions and commitments are being delivered."
      implemented: false
    - id: root-cause-drill-down
      description: "Enables drill-down into the root causes of a specific initiative's underperformance."
      implemented: false
    - id: session-continuity
      description: "Maintains memory across sessions to enable meeting-to-meeting continuity."
      implemented: false
```

### Updated `api/prompts/router.md`

The prompt now lists skills under each agent so the LLM can resolve both in one call:

```markdown
You are a query router for the NEOM CEO Cockpit.

Given a user query, identify the best agent AND the specific skill within that agent
that should handle it.
Return ONLY a JSON object on a single line — no explanation, no markdown, no code block.

Agents and their skills:

risk-radar — Risk & Resilience: risks, threats, execution readiness, timeline credibility
  skills: kpi-deviation-analysis, timeline-credibility-assessment, execution-readiness-check,
          operational-risk-analysis, talent-risk-analysis, macro-risk-analysis

delivery-engine — Execution Velocity: portfolio pace, schedule compression, resequencing, hiring
  skills: schedule-compression-analysis, portfolio-resequencing, technology-deployment-pace,
          hiring-pace-assessment, modular-delivery-opportunities

value-lens — Financial Impact: value tracking, financial assumptions, capital allocation, scenarios
  skills: value-tracking, financial-assumption-stress-test, capital-allocation-optimization,
          commercial-scenario-modelling, operational-economics-monitoring

gap-finder — White Spot & Decision Intelligence: what's not tracked, board gaps, talent gaps
  skills: board-commitment-gap-analysis, planning-quality-assessment, talent-gap-identification,
          technology-readiness-gap, exploration-pipeline-gap, strategic-coverage-gap

action-desk — Action & Accountability: actions, commitments, root cause, session continuity
  skills: action-conversion, commitment-tracking, root-cause-drill-down, session-continuity

If the query maps to an agent and skill, return: {"agent_id": "<id>", "skill_id": "<id>"}
If the query does not fit any agent or skill, return: {"agent_id": null, "skill_id": null}

User query: {query}
```

### Updated `agent_registry.py`

```python
# Additional index built after AGENTS loaded
_SKILL_INDEX: dict[str, dict] = {
    f"{a['id']}/{s['id']}": s
    for a in AGENTS
    for s in a.get("skills", [])
}

async def route_query(text: str) -> dict | None:
    try:
        prompt = _ROUTER_PROMPT.replace("{query}", text)
        response = await complete_chat([{"role": "user", "content": prompt}])
        parsed = json.loads(response)
        agent_id = parsed.get("agent_id")
        skill_id = parsed.get("skill_id")
        if not agent_id or not skill_id:
            return None
        agent = _AGENT_INDEX.get(agent_id)
        skill = _SKILL_INDEX.get(f"{agent_id}/{skill_id}")
        if not agent or not skill:
            return None
        return {"agent": agent, "skill": skill}
    except Exception as e:
        _log.warning("Routing failed: %s", type(e).__name__)
        return None
```

### Updated `query.py` — skill implementation check

```python
@router.post("/query")
async def query(body: QueryRequest):
    last = _last_user_message(body.messages)

    # Step 1: route to agent + skill
    result = await route_query(last)
    if result is None:
        async def _oos():
            yield f"data: {json.dumps({'type': 'not_supported', 'content': build_out_of_scope_message()})}\n\n"
        return StreamingResponse(_oos(), media_type="text/event-stream")

    agent, skill = result["agent"], result["skill"]

    # Step 2: check skill implementation
    if not skill["implemented"]:
        available = [s["description"] for s in agent["skills"] if s["implemented"]]
        msg = (
            f"{agent['label']} — {skill['description']}\n\n"
            f"This capability is not yet built."
        )
        if available:
            msg += "\n\nHere's what I can do in this area today:\n" + "\n".join(f"• {d}" for d in available)
        else:
            msg += f"\n\nNo skills in {agent['label']} are implemented yet — this agent is on the roadmap."
        async def _not_impl():
            yield f"data: {json.dumps({'type': 'not_supported', 'content': msg})}\n\n"
        return StreamingResponse(_not_impl(), media_type="text/event-stream")

    # Step 3: validate and stream
    validation = await validate_query(agent, last)
    if not validation.get("can_answer", True):
        reason = validation.get("reason", "Insufficient data.")
        needs = validation.get("needs", "")
        content = reason + (f" To answer this, I would need: {needs}" if needs else "")
        async def _blocked():
            yield f"data: {json.dumps({'type': 'not_supported', 'content': content})}\n\n"
        return StreamingResponse(_blocked(), media_type="text/event-stream")

    caveats = validation.get("caveats", [])
    system_prompt = agent["system_prompt"]
    if caveats:
        caveat_text = "\n\nNote these caveats and state them transparently in your answer:\n" \
                      + "\n".join(f"- {c}" for c in caveats)
        system_prompt = system_prompt + caveat_text

    async def _stream():
        # First event: agent identity — frontend uses this to label the response
        yield f"data: {json.dumps({'type': 'agent', 'agent_id': agent['id'], 'content': agent['label']})}\n\n"
        async for chunk in agent_service.stream_agent_response(body.messages, system_prompt=system_prompt):
            yield chunk

    return StreamingResponse(_stream(), media_type="text/event-stream")
```

### Full pipeline after this story

```
route_query(last_user_message)
  └─ None                    → not_supported (out of scope)
  └─ {agent, skill}
       └─ skill.implemented == false → not_supported (skill not built, lists what IS available)
       └─ skill.implemented == true
            └─ validate_query(agent, last)
                 └─ can_answer == false → not_supported (reason + what's needed)
                 └─ can_answer == true  → stream_agent_response(caveats injected)
```

### SSE event types after this story

```
data: {"type": "agent",        "agent_id": "risk-radar", "content": "Risk Radar"}  ← NEW, always first on a matched stream
data: {"type": "token",        "content": "word "}
data: {"type": "done",         "content": ""}
data: {"type": "not_supported","content": "..."}
data: {"type": "error",        "content": "LLM unavailable"}
```

The `agent` event is only emitted when a skill is implemented and the stream proceeds — not on `not_supported` paths. The frontend engineer (workstream B) needs to handle this event to display the agent label in the drawer header.

### Marking a skill as implemented

When a skill is built (in a future story), set `implemented: true` in `agents.yaml` — no Python changes required. The routing and implementation check pick it up automatically at startup.

### What NOT to touch

- Any file outside `api/`
- `api/services/agent_service.py` — no further changes
- `api/services/tools/`
- `api/services/validator_service.py` — no changes
- All existing tests (update routing tests only)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Implemented skill-level routing across all 6 files per story spec.
- `risk-radar/kpi-deviation-analysis` set to `implemented: true` as the single live skill — fetches KPI deviation data via existing tools and responds. All other 25 skills remain `implemented: false`.
- `_SKILL_INDEX` built at startup as a flat `"agent_id/skill_id"` → skill dict mapping (26 entries across 5 agents).
- `route_query()` now parses both `agent_id` and `skill_id` from a single LLM response; returns `{"agent": dict, "skill": dict}` or `None`.
- `query.py` inserts skill implementation check between routing and validation; unimplemented skills emit `not_supported` with the skill name and list of available skills in that agent.
- 48 tests pass (40 existing, 8 new/updated); no regressions.

### File List

- `api/agents.yaml` (modified — skills added to all agents)
- `api/prompts/router.md` (modified — skill-aware prompt)
- `api/services/agent_registry.py` (modified — `_SKILL_INDEX`, updated `route_query`)
- `api/routers/query.py` (modified — skill implementation check added)
- `tests/test_agent_registry.py` (modified)
- `tests/test_query_routing.py` (modified)

## Change Log

- 2026-04-13: Story created by claude-sonnet-4-6. Single router call resolves agent + skill. All skills start unimplemented. Skill implementation toggled via `agents.yaml` only — no code change needed to activate a skill.
- 2026-04-13: Story implemented by claude-sonnet-4-6. Skill-level routing live. `risk-radar/kpi-deviation-analysis` enabled as first implemented skill. 48 tests pass.
