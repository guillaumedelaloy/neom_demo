---
title: "Product Brief Distillate: NEOM Strategy Execution AI"
type: llm-distillate
source: "product-brief-neom_demo.md"
created: "2026-04-09"
updated: "2026-04-15"
purpose: "Token-efficient context for downstream PRD, architecture, and story creation"
---

# Distillate: NEOM Strategy Execution AI

## Core Context

- **Client:** NEOM (Ma'aden), Saudi state mining company executing a 2040 transformation strategy
- **Problem being solved:** Monthly Strategy Execution (MSE) review is manually assembled as a PowerPoint deck — takes days to prepare, can only answer pre-anticipated questions, coverage is uneven across strategic agendas
- **POC purpose:** Replace MSE PowerPoint with (1) static dashboard mock + (2) AI chat interface. Internal working prototype — not a sales demo.
- **Hard constraints:** 3 days, 3 people, must run fully locally, two commands to start
- **Relationship to previous product direction:** Previous framing (Jarvis/Bob CEO cockpit, T-shaped delivery, Agent A/B, TTS, iPad, confidence traffic light) is FULLY REPLACED by this brief. Do not reference or reintroduce any of those concepts.

## Two-Component Architecture

### Component 1 — Static Dashboard Mock
- Visual replica of MSE PowerPoint structure (KPI status, initiative tracking, BU performance)
- Data: hardcoded or JSON-driven. NO live data pipeline.
- Purpose: demonstrates dashboard vision; frees capacity for agent depth
- Built independently (Person 1, Epic 7) — no backend dependency

### Component 2 — AI Chat Interface
- Single natural-language window. User never selects an agent or navigates menus.
- Orchestrator classifies question → routes to correct agent context
- Agent identity is surfaced in response (e.g., "Answered by DELIVERY ENGINE")
- No agent menu, no confidence traffic light, no tier indicators
- Simple questions should usually resolve in 1-3 sentences; structure appears only when it adds trust or clarity

## Agent Architecture

Five specialist agents + orchestrator + retrieval layer.

| Agent | Role tagline | Question domain | POC implementation | Data source |
|---|---|---|---|---|
| DELIVERY ENGINE | Execution Velocity | Schedule pace, milestone status, critical path, delay/acceleration scenarios | TOOL-BASED (full depth) | Primavera XER → Python tools |
| VALUE LENS | Financial Impact | EBITDA tracking, capex, IRR/NPV, what-if financial scenarios | TOOL-BASED (full depth) | XLS financial model → CSV preprocessing → Python tools |
| RISK RADAR | Risk & Resilience | Risk exposure, timeline credibility, portfolio stress tests | RAG + structured system prompt | ChromaDB-indexed strategy PDFs |
| GAP FINDER | White Spot & Decision Intel | Coverage gaps, board commitments, white spots, people/tech/exploration gaps | RAG + structured system prompt | ChromaDB-indexed strategy PDFs |
| ACTION DESK | Action & Accountability | Open actions, overdue commitments, stalled decisions, meeting continuity | RAG + structured system prompt | ChromaDB-indexed strategy PDFs |

**Orchestrator:** Classifies all questions. Routes to single agent or combination. Handles "So What" synthesis questions by aggregating across all agents and producing an opinionated executive narrative.

**Retrieval layer:** Handles direct factual lookups (e.g., "What is total capex this year?") without triggering full agent analysis. Returns in seconds.

## Strategic Agendas Covered (Full Platform Vision)

All five agents apply across all six agendas with equal analytical rigor:
1. Capital projects (Phosphate, Aluminum, BMNM — largest by value)
2. Commercial & product excellence (product mix, new markets, margin)
3. Operational excellence & productivity (yield, reliability, unit cost)
4. Technology & digitalization (TechOps, digital twins, APC, adoption tracking)
5. People agenda (hiring, talent development, capability-building)
6. Exploration (discovery-to-development pipeline, license portfolio, partnerships)

## Question Types (12 total)

Status, Query, Consistency, Gaps, What If, Root Cause, Risk, Prioritize, Optimize, Action, Scenarios, So What

Each agent handles a defined subset. "So What" always routes through Orchestrator synthesis. "Query" often hits the retrieval layer directly.

## Routing Logic (summary)

| Question type | Primary handler |
|---|---|
| Status | Retrieval layer → ACTION DESK |
| Query | Retrieval layer → DELIVERY ENGINE |
| Consistency | GAP FINDER + ACTION DESK |
| Gaps | GAP FINDER |
| What If | DELIVERY ENGINE + VALUE LENS (+ RISK RADAR for macro scenarios) |
| Root Cause | DELIVERY ENGINE + GAP FINDER + ACTION DESK |
| Risk | RISK RADAR (core) |
| Prioritize | All agents |
| Optimize | DELIVERY ENGINE + VALUE LENS |
| Action | ACTION DESK (core) |
| Scenarios | DELIVERY ENGINE + VALUE LENS + RISK RADAR |
| So What | Orchestrator synthesis across all agents |

## Technical Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (App Router) | Deployed to Vercel; `pnpm dev` locally |
| Backend | FastAPI (Python) | `uvicorn api.main:app` locally; GCP Cloud Run for deployment |
| Vector store | ChromaDB | Local; indexes strategy PDFs for RAG agents |
| LLM runtime | LiteLLM | Default `LLM_MODEL=anthropic/claude-opus-4-6`; still provider-configurable |
| Schedule data | XER parser | Python; reads Primavera XER files |
| Financial data | XLS → CSV preprocessor | Converts financial model before tool use |
| Deployment | Vercel (frontend) + GCP Cloud Run (backend) | Epic 8, last |

## Epic Structure (for story creation reference)

| Epic | Focus | Owner | Dependency |
|---|---|---|---|
| 2 | Data Layer | Person 3 | Foundation (done) |
| 3 | Shell AI Query Bar | Person 2 | Foundation (done) |
| 4 | Connect Agent to Data Layer | Person 2 | After Epic 3 |
| 5 | Tool-Based Agents (DELIVERY ENGINE + VALUE LENS) | Person 3 | Parallel with Epic 6 |
| 6 | RAG-Based Agents (RISK RADAR + GAP FINDER + ACTION DESK) | Person 2 | Parallel with Epic 5 |
| 7 | Frontend Mockup Integration | Person 1 | Fully independent |
| 8 | Deployment Setup (GCP + Vercel) | First available | After Epics 4–6 stable |

Epics 1–3 are preserved from previous sprint. Old Epics 4–7 (What-If Engine, Action Rec/PIF, CEO Cockpit Agent Layer, TTS/iPad) are REMOVED.

## POC Success Criteria

- Dashboard mock renders MSE-equivalent view
- Orchestrator routes ≥3 distinct question types to correct agent context
- DELIVERY ENGINE answers a schedule question using real XER-derived data
- VALUE LENS answers a financial question using real XLS-derived CSV data
- RISK RADAR, GAP FINDER, ACTION DESK respond coherently without hallucinating numbers
- System starts locally: `pnpm dev` + `uvicorn api.main:app`

## Agent Guardrail Behavior (in scope, all agents)

Agents self-assess data availability before answering. Two behaviors:

1. **Data sufficient:** Answer with source citation (which XER activities, CSV rows, or retrieved document sections backed the answer).
2. **Data insufficient/thin:** Answer what is possible, flag uncertainty, and name specifically what data is missing and what it would enable. Never hallucinate.

**Tool-based agents** (DELIVERY ENGINE, VALUE LENS): deterministic check — they know exactly which files and fields are present.
**RAG agents** (RISK RADAR, GAP FINDER, ACTION DESK): assess retrieval quality; flag when context is sparse or from an outdated document version.

This is primarily a **prompt engineering concern**, not a UI feature. No confidence score widget. No traffic light. The guardrail is expressed in the agent's natural-language response.

## Response Governance

- Cite **original raw files only** in user-facing answers; never cite tool names or processed artifacts.
- If a claim plausibly exists in multiple catalogue sources, cross-check at least two available sources when feasible.
- If sources agree, state corroboration briefly. If they conflict, name the source of truth explicitly using the Data Catalogue authority hierarchy.
- Strategy documents are consulted when they materially improve rationale, qualitative risk framing, or execution context; they do not override IMP status/timing or financial model figures.
- If the tool loop runs out of room or the model returns empty content, the runtime makes one consolidation attempt before returning `not_supported`.

Example phrasings:
- "I can confirm X, but I'm missing [data Y] to calculate [Z]. If you provide [data Y], I can give you the full figure."
- "My answer is based on the September review pack — if you have a more recent risk register, index it and re-ask."

**Distinction from removed feature:** The old confidence traffic light indicated whether the *agent itself* was fully built (Green/Amber/Red delivery state). Guardrails are about the *answer's* data sufficiency. Completely different concern.

## Explicitly Out of Scope (do not re-introduce)

- Bob/CEO Jarvis persona or single-user framing
- T-shaped delivery / confidence traffic light / Amber/Red answer tiers
- Agent A / Agent B as named deliverables
- TTS / voice / audio
- iPad as primary optimization target
- Action recommendation engine (PIF generation)
- Explicit agent selection menu
- Live data pipeline to the dashboard
- Generalized multi-variable financial modeling beyond XLS-derived CSV tools
- Complex multi-agent orchestration (agents do not call each other; orchestrator routes)

## BCG IP Framing

The five-agent framework is BCG's structural view of the complete question space for MSE. Key differentiators:
- GAP FINDER exists because execution gaps in commercial, people, tech, and exploration accumulate silently — they will not surface unless explicitly tracked
- ACTION DESK closes the insight-to-accountability loop — every risk or gap must translate to a named owner and date
- Orchestrator's "So What" synthesis layer produces board-ready narrative, not just data retrieval
- Platform treats a hiring plan and a $5B capital project with the same analytical rigor

## Users

- **CEO and senior leadership** — primary during MSE review sessions
- **Strategy execution team** — prep and ad hoc analysis
- **BCG engagement team** — demonstrates BCG's strategy execution intelligence framework as software
