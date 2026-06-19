---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-neom_demo.md
  - _bmad-output/planning-artifacts/product-brief-neom_demo-distillate.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-13.md
workflowType: prd
classification:
  projectType: internal_ai_poc
  domain: mining_strategy_execution
  complexity: medium
  projectContext: greenfield
documentCounts:
  briefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 1
lastEdited: '2026-04-15'
editHistory:
  - date: '2026-04-09'
    changes: >
      Replaced all synthetic/mock data references with real source documents in
      data_extract/. Updated Data Module Strategy table and Data Layer
      architecture. Called out Primavera Gantt extract (Strategy Execution folder)
      as Tier 2 critical data source. Ingestion and schema mapping deferred to
      implementation.
  - date: '2026-04-10'
    changes: >
      Major reframe based on updated stakeholder input. Vision shift from
      "Execution Intelligence for SEO" to "Jarvis CEO Cockpit for Bob". Primary
      user changed to CEO. T-shaped POC delivery model introduced with confidence
      traffic light on agent responses. Product scope restructured into three tiers
      (In Scope / Pending Time-Prio / Out of Scope). User journeys reordered with
      Bob as lead journey. iPad-optimized UI added as requirement. Added FR34–FR38
      (agent menu, confidence traffic light, iPad layout). Updated what-if FRs for
      open-ended natural language input. Added NFR15 (iPad compatibility). Removed
      "no mobile responsiveness" constraint.
  - date: '2026-04-13'
    changes: >
      Major reframe based on stakeholder session April 13. Product vision shifted
      from "Jarvis CEO Cockpit for Bob" to "NEOM Strategy Execution AI" —
      automating the Monthly Strategy Execution (MSE) review process. Removed:
      Bob persona, T-shaped delivery, confidence traffic light, Agent A/Agent B
      as named deliverables, what-if engine, action recommendation, PIF
      generation, agent menu with user selection, iPad primary optimization, TTS.
      Added: two-component model (static dashboard mock + 5-agent classifier chat),
      DELIVERY ENGINE, VALUE LENS, RISK RADAR, GAP FINDER, ACTION DESK agent
      contexts, ChromaDB RAG layer, GCP Cloud Run / local FastAPI backend.
      Epics 1–3 preserved; old Epics 4–7 replaced with new Epics 4–8.
      FRs removed: FR14, FR20–FR42. FRs added: FR20–FR32.
      User journeys replaced with MSE-process-anchored scenarios.
      Constraint: 3 days, 3 people, must run fully locally.
      Post-validation fixes: Journey 5 added (RISK RADAR success scenario, FR27 traceability);
      Executive Summary clarified (Epic 7 static mock vs Epic 2 live dashboard);
      FR22 tightened (testable criterion replacing "sufficient confidence").
  - date: '2026-04-15'
    changes: >
      Backfilled BMAD artefacts to reflect prompt/config changes already shipped or in-flight.
      Added cross-cutting response-governance requirements: concise-by-default answers,
      original-file citations, textual confidence and ambiguity handling, multi-source
      corroboration with explicit source-of-truth on conflict, conditional use of strategy
      documents, consolidation-before-not_supported behaviour, and default model update to
      anthropic/claude-opus-4-6.
---

# Product Requirements Document - neom_demo

**Author:** BCG
**Date:** 2026-04-09
**Last Updated:** 2026-04-15

## Executive Summary

NEOM Strategy Execution AI is a proof-of-concept platform that automates and enhances the Monthly Strategy Execution (MSE) review process — currently produced manually as a multi-slide PowerPoint deck assembled over 3 days before each board session.

The platform has two components:

1. **Dashboard** — A new static mockup (Epic 7) that visually replicates the MSE PowerPoint output structure: KPI status by BU, initiative tracking, and BU performance summary. No live data pipeline required for this component. Built as a frontend mockup and integrated into the main codebase alongside the existing live KPI dashboard from Epics 1–3 (scorecards, trend charts, AI narrative headlines — already built and preserved).

2. **Chat** — An AI chat interface backed by a question classifier/orchestrator that routes each incoming question to one of five specialist agent contexts: DELIVERY ENGINE, VALUE LENS, RISK RADAR, GAP FINDER, and ACTION DESK. The backend classifies the question and applies the appropriate context and tools. The user sees a single unified chat interface; the agent name is surfaced in the response label.

**Agent implementation depth:**
- **DELIVERY ENGINE** — answers schedule and velocity questions using parsed Primavera XER data via tool calls
- **VALUE LENS** — answers financial questions using XLS-derived CSV data via tool calls
- **RISK RADAR, GAP FINDER, ACTION DESK** — answer domain questions via ChromaDB-indexed PDFs and structured system prompts scoped to each agent's domain

**Delivery context:** 3-day build, 3-person team. Must run fully locally. Built to demonstrate MSE automation capability for internal stakeholder alignment.

**Primary users:** Leadership and strategy team members preparing for and participating in the monthly MSE review process.

### What Makes This Special

**Replacing a manual 3-day process.** The MSE PowerPoint is currently assembled by hand — pulling Primavera exports, reconciling BU actuals from Excel, formatting slides. The dashboard component makes this instantaneous.

**Grounded answers to the questions that matter most.** DELIVERY ENGINE and VALUE LENS provide tool-backed answers to the two question types that drive the most discussion in MSE reviews: schedule status and financial impact. Answers are grounded in real source data, not LLM generation.

**Question routing as a UX primitive.** The user does not choose an agent — they ask a question. The classifier routes silently. The agent name appears in the response, building user intuition about the system's capabilities over time.

**Local-first.** The system runs on a laptop with two terminal commands. No cloud configuration required to demonstrate.

**Trust contract is part of the product.** Answers are concise by default, cite original raw source files rather than tools or processed artefacts, use textual confidence and ambiguity cues only when they materially improve trust, and explicitly name corroboration or source-of-truth decisions when multiple sources are involved.

## Response Governance

- **Concise by default:** Simple factual questions should usually resolve in 1-3 sentences.
- **Raw-file citations only:** User-facing answers cite original XER files, the financial model workbook, or named PDF/PPT source documents — never tool names or processed files like `schedules.json`.
- **Confidence is textual:** When an answer uses retrieved data or explicit analysis, it may include concise data-confidence and analysis-confidence labels. This is not the removed confidence-traffic-light UI.
- **Corroboration and conflict handling:** If a claim plausibly exists in multiple data-catalogue sources, the system should cross-check at least two available sources when feasible, state corroboration when they agree, and surface ambiguity plus the chosen source of truth when they conflict.
- **Strategy documents are conditional context:** Strategy and execution documents are consulted when they materially improve framing, rationale, or qualitative risk context; they never override higher-authority schedule or financial sources.
- **Graceful consolidation:** If the tool loop exhausts its budget or returns empty content, the runtime makes one consolidation attempt using gathered evidence before falling back to `not_supported`.

## Project Classification

- **Type:** Pitch AI demonstration — strategy execution automation POC
- **Domain:** Mining strategy execution (monthly review automation)
- **Complexity:** Medium — 3-day POC, 3-person team, file-based data layer, local-first deployment
- **Context:** Greenfield — builds on existing Epic 1–3 foundation (navigation shell, data dashboard, query bar)

## Success Criteria

### User Success

- **Strategy lead:** Opens the MSE dashboard and sees the monthly review structure populated — KPI status, initiative tracking, BU performance — without assembling a single slide. Uses the chat to ask a schedule question and gets a grounded answer in under 15 seconds.
- **Strategy director (mid-meeting):** Types a schedule or financial question into the chat during the MSE review. The correct agent responds with source-grounded data. The answer is usable immediately without any post-processing.
- **POC close:** A stakeholder asks a question the system was not explicitly scripted for. DELIVERY ENGINE or VALUE LENS answers it using real data. The question classifier routes correctly. Zero hallucinated numbers.

### Technical Success

- **Dashboard mock:** Visually replicates the structure of the MSE PowerPoint — KPI status by BU, initiative tracking, BU performance summary — rendered from static JSON, no loading dependency
- **Orchestrator:** Correctly routes questions to the appropriate agent context for ≥3 distinct question types across the 5 agents
- **DELIVERY ENGINE:** Answers a schedule question using real Primavera XER-derived data — response cites specific activity names, RAG status, or delay metrics
- **VALUE LENS:** Answers a financial question using real XLS-derived CSV data — response cites specific EBITDA, capex, or production figures
- **RAG agents:** RISK RADAR, GAP FINDER, and ACTION DESK respond coherently to domain questions, citing original source documents only when they materially improve the answer, without hallucinating numerical figures
- **Answer contract:** Simple factual answers stay concise, original-file citations are present, and source conflicts are surfaced instead of being smoothed over
- **Local run:** Full system starts with `pnpm dev` + `uvicorn api.main:app --reload` — no cloud service required

### Measurable Outcomes

| Metric | POC Target |
|--------|-----------|
| Agent tool response time (DELIVERY ENGINE, VALUE LENS) | <15 seconds |
| Hallucinated numerical answers | 0 |
| Tool-backed agents (grounded in real data) | 2 (DELIVERY ENGINE, VALUE LENS) |
| RAG-backed agents | 3 (RISK RADAR, GAP FINDER, ACTION DESK) |
| Distinct question types correctly routed | ≥3 |
| Local startup commands | 2 (`pnpm dev` + `uvicorn`) |

## Product Scope

### In Scope

- **MSE Dashboard Mockup** — Static frontend mockup replicating the Monthly Strategy Execution PowerPoint output structure: KPI status by BU, initiative tracking, BU performance summary. Rendered from hardcoded JSON — no live data pipeline required
- **AI Chat Interface** — Single chat window backed by a question classifier/orchestrator. User sees one interface; agent name is surfaced in the response label
- **Question Classifier / Orchestrator** — Classifies incoming questions and routes to the appropriate agent context. Handles ambiguous questions with a graceful "out of scope" response rather than incorrect routing
- **DELIVERY ENGINE** — Tool-based agent answering schedule and velocity questions using parsed Primavera XER data (all 4 BUs)
- **VALUE LENS** — Tool-based agent answering financial questions using XLS-derived CSV data (EBITDA, capex, production by BU and year)
- **RISK RADAR** — RAG-based agent answering risk questions via ChromaDB-indexed PDFs + structured system prompt scoped to NEOM's risk taxonomy
- **GAP FINDER** — RAG-based agent answering strategic gap questions via ChromaDB-indexed PDFs + structured system prompt scoped to gaps between planned and actual strategic outcomes
- **ACTION DESK** — RAG-based agent answering action and recommendation questions via ChromaDB-indexed PDFs + structured system prompt
- **Data layer** — Primavera XER parser, XLS → CSV preprocessing, ChromaDB indexing of PDF documents; tools callable by agents
- **Performance Dashboard (Epic 2)** — Live data KPI scorecards, trend charts, AI narrative headlines, suggested interrogations for all 4 active BUs — built in Epic 2, preserved
- **Query bar (Epic 3)** — Natural language query bar with data tool access and multi-turn conversation — built in Epic 3, preserved
- **Local deployment** — Full system runs on a single machine with `pnpm dev` + `uvicorn api.main:app`
- **GCP Cloud Run** — Backend containerised for deployment to GCP Cloud Run when needed for remote demonstration

### Out of Scope

- Confidence traffic light on agent responses — removed; agent name label replaces it
- Agent menu with user selection — user asks questions; classifier routes; no manual selection
- What-if scenario engine (open-ended Gantt simulation) — replaced by DELIVERY ENGINE tool calls
- Action recommendation + PIF report generation — replaced by ACTION DESK agent context
- TTS / voice reading — removed
- iPad as primary optimization target — removed; desktop/standard browser is the target
- Amber/Red mock response tier — removed; agents either answer with grounded data or decline
- Live data pipeline for the MSE dashboard mockup — static JSON only for Epic 7
- Full multi-agent orchestration — classifier routes to one agent per question; no chained multi-agent workflows
- In-app authentication (Vercel Access / local environment variable gates handle access)
- Database (file-based only)

## User Journeys

### Journey 1 — Khaled (Strategy Lead): The Morning the Deck Assembled Itself

Khaled is Head of Strategy Execution at NEOM. Every month, he and his team spend 3 days pulling Primavera schedule exports, reconciling BU actuals from 8 separate Excel files, and assembling 40 slides for the MSE review. The review is in 2 hours.

**Opening scene:** Khaled opens the platform. The MSE dashboard is live — KPI status for all 4 BUs, initiative tracking by strategic pillar, performance summary with flagged deviations. No loading spinners. No data wrangling. He reads it in 10 minutes.

**Rising action:** He spots the Phosphate BU KPI flagged. He opens the chat and types: *"What's behind the Phosphate production shortfall this quarter?"* The question classifier routes to DELIVERY ENGINE. The response cites three specific activities from the underlying IMP XER sources: Phos-4 train startup delayed 6 weeks, recovery rate below baseline for Q1, maintenance window overrun. Source: `IMP — Phosphate Projects V18.xer`.

**Climax:** Khaled has his talking points 2 hours before the review starts — for the first time without opening Primavera or Excel.

**Resolution:** He sends the MSE pack summary to the CFO 90 minutes before the session. The CFO replies: *"How did you get this out so fast?"*

**Requirements revealed:** MSE dashboard mock rendering from static JSON, question classifier routing to DELIVERY ENGINE, grounded schedule data in response with source citation.

---

### Journey 2 — Layla (Strategy Director): The Schedule Claim That Didn't Hold

During the MSE review, the Phosphate BU lead presents: *"Phos-5 is on track — no change to FID date."* Layla has seen this slide before. She wants to verify it independently, without breaking the meeting flow.

**Opening scene:** Layla opens the chat on her laptop, mid-meeting. She types: *"What is the current schedule status of Phos-5?"*

**Rising action:** The classifier routes to DELIVERY ENGINE. In 11 seconds, the response returns: Phos-5 Front-End Engineering is showing RAG status Amber, with 3 critical path activities behind baseline by 14–21 days. The planned FID date has not been formally revised but is at risk given current progress.

**Climax:** Layla shows the screen to the meeting facilitator. The BU lead is asked to explain the gap between their verbal update and the schedule data.

**Resolution:** A formal schedule review is added to the action log before the meeting closes.

**Requirements revealed:** DELIVERY ENGINE answering a schedule question with XER-derived RAG status and baseline deviation data; response time <15 seconds; response cites specific activity names and delay metrics.

---

### Journey 3 — Omar (CFO): The Financial Consequence of a One-Quarter Slip

The board is debating whether to defer the Aluminum smelter expansion FID by one quarter to reduce near-term capex pressure. Omar needs a financial framing before the vote.

**Opening scene:** Omar types into the chat: *"If we defer the aluminum smelter expansion FID by one quarter, what's the EBITDA impact?"*

**Rising action:** The classifier routes to VALUE LENS. The agent queries the XLS-derived CSV financial model. In 13 seconds, the response returns: a one-quarter FID slip delays first production by one quarter, reducing Aluminum EBITDA contribution by SAR 280M in FY2027 and shifting capex peak from Q2 to Q3 FY2026. The response cites the approved FY25–2040 financial model.

**Climax:** Omar shares the response with the board. The deferral decision is made with a quantified cost attached — not a verbal estimate.

**Resolution:** The board approves the deferral and records the SAR 280M EBITDA impact in the decision log.

**Requirements revealed:** VALUE LENS answering a financial question with XLS-derived EBITDA and capex data; specific figures cited; source document named; response time <15 seconds.

---

### Journey 5 — Layla (Strategy Director): The Risk Register Nobody Checked

With 30 minutes before the MSE review, Layla wants to know whether there are documented risks for Phos-5 that the BU's verbal update may have omitted.

**Opening scene:** She types into the chat: *"What risks have been flagged for the Phos-5 project?"*

**Rising action:** The classifier routes to RISK RADAR. The agent retrieves relevant passages from ChromaDB-indexed strategy documents. In 9 seconds, the response surfaces three specific risks: (1) schedule credibility risk — critical path activities behind baseline by 14–21 days; (2) contractor capacity risk — two key contractors at maximum utilization with no identified contingency; (3) regulatory approval risk — environmental permit pending with no confirmed timeline. Source cited: `Strategy Execution/Strategic Execution Update Q1 2026.pdf`.

**Climax:** Layla has a structured risk briefing before walking into the meeting — from a document she hadn't opened.

**Resolution:** She raises all three risks in the opening agenda slot. The BU team confirms two of them. The third triggers an action item to clarify the permit timeline with the regulatory affairs function.

**Requirements revealed:** RISK RADAR retrieving ChromaDB-indexed PDFs and returning structured domain-scoped response; source document cited by name; no figures generated that are not present in the retrieved context; response time <15 seconds.

---

### Journey 4 — Layla (Edge Case): The Honest No

Later in the review, Layla asks: *"What's the reserve life impact if we cut the exploration geophysics budget by 20%?"*

**The moment:** This touches exploration data — currently outside the system's indexed document set. The classifier attempts routing and cannot reach sufficient confidence for any agent. The system responds with a clear scope explanation and an actionable narrowing path: *"I don't currently have exploration budget or reserve data indexed to answer this accurately. If you index the relevant exploration documents, I can answer that. For now I can help with schedule, financial, or indexed strategy questions."*

**Resolution:** Layla notes the gap. No hallucinated answer is produced.

**Requirements revealed:** Graceful degradation on out-of-scope queries — explicit "not currently supported" response citing the missing data, no routing to an incorrect agent, no hallucinated figures.

---

### Journey Requirements Summary

| Capability | Driven By |
|-----------|-----------|
| MSE dashboard mock — KPI status, initiative tracking, BU summary | Journey 1 |
| Question classifier routing to correct agent | Journeys 1, 2, 3 |
| DELIVERY ENGINE — schedule/RAG status/baseline deviation from XER | Journeys 1, 2 |
| VALUE LENS — EBITDA/capex impact from XLS-derived CSV | Journey 3 |
| RISK RADAR — ChromaDB-retrieved risks, structured response, source citation | Journey 5 |
| Source citation in agent response | Journeys 1, 2, 3, 5 |
| Agent name surfaced in response label | Journeys 1, 2, 3, 5 |
| Agent response time <15 seconds | Journeys 2, 3, 5 |
| No figures generated outside retrieved context | Journey 5 |
| Graceful out-of-scope response — no hallucination, no incorrect routing | Journey 4 |

## Domain-Specific Requirements

### Data & Calculation

- No external logging or third-party analytics SDKs — data stays within the deployment environment
- Agent tool outputs: Python owns all data retrieval and arithmetic; the LLM narrates tool output, it does not generate figures independently
- If agent tool invocation fails: surface a clear error state in the chat response — never a plausible-looking wrong answer
- ChromaDB is populated from PDFs in `data_extract/` — indexing is a one-time setup step per environment; no cloud RAG service used

### Local Run Requirements

- Full system starts locally with two commands: `pnpm dev` (Next.js, port 3000) and `uvicorn api.main:app --reload` (FastAPI, port 8000)
- No cloud service dependency required for local operation
- Environment variables managed via `.env` files, not committed to the repository

### POC Simplifications (explicit)

- Local environment access control — no in-app login screen required for local run
- No role-based access — all users see the same view
- No audit logging, no data retention policy
- MSE dashboard mockup is static JSON — no live data pipeline for Epic 7 component

### Deployment

- **Frontend:** Vercel (Next.js, GitHub auto-deploy on push to `main`)
- **Backend:** GCP Cloud Run (FastAPI container); local default is `uvicorn`
- Stack: Next.js + FastAPI + Python 3.11 + LiteLLM + ChromaDB
- Package manager: `pnpm`

### Branding

- NEOM logo (copied from `repo_design/`) and Industrial Mineral design language matching Benchmark Intelligence: warm stone page (`#f4f1ea`), charcoal nav (`#1a1c1b`), mineral gold accent (`#b8956a`), teal data/CTAs (`#2d6a66`). IBM Plex Sans font. See `_bmad-output/planning-artifacts/design-system.md` for full token system and component conventions.
- Official naming: Ma'aden, Phos-4, Phos-5 — not generic placeholders

## Technical Architecture & Requirements

### Frontend

- Next.js App Router (React)
- Custom NEOM Industrial Mineral design system: `--ma-*` / `--ai-*` CSS token system, IBM Plex Sans font, charcoal nav, warm stone page background, mineral gold + teal accents. Ported from `repo_design/`. See `_bmad-output/planning-artifacts/design-system.md` for full spec.
- Recharts for trend charts
- Tailwind CSS v4 — light page background (`#f4f1ea`), dark charcoal sidebar (always dark regardless of page), AI chrome panels (`#0e0f10`)

### Backend / API

- FastAPI + Python 3.11, run locally with `uvicorn`, deployed to GCP Cloud Run
- LiteLLM for LLM integration: provider-agnostic interface; default provider Claude (Anthropic), swappable via a single environment variable — no application code changes required
- ChromaDB for document retrieval — RAG agents (RISK RADAR, GAP FINDER, ACTION DESK) query ChromaDB collections indexed from PDF documents in `data_extract/`
- FastAPI `StreamingResponse` (SSE) → Next.js `ReadableStream` → React streaming UI

### Data Layer

- **DELIVERY ENGINE tools:** Primavera XER parser reads schedule files from `data_extract/project_schedules/`, extracting activity IDs, names, durations, dependencies, planned/actual dates, RAG status, and baseline dates
- **VALUE LENS tools:** XLS → CSV preprocessor reads the approved FY25–2040 Excel financial model, exposing EBITDA, capex, and production time series by BU and year as CSV-backed tool functions
- **RAG agents:** ChromaDB collections indexed from strategic PDFs in `data_extract/` — one collection per agent domain or shared collection with metadata filtering
- No database — all data is file-based; agents read from `data_extract/` at runtime

### LLM Integration

- Provider: Configurable via environment variable — default Claude (Anthropic); LiteLLM provider abstraction ensures no provider lock-in
- All LLM calls routed through `api/services/llm_client.py` (single module)
- Tool-based agents (DELIVERY ENGINE, VALUE LENS): tool-calling agent pattern — LLM parses question → invokes Python tool → narrates structured output
- RAG agents (RISK RADAR, GAP FINDER, ACTION DESK): retrieval → structured system prompt → single-shot generation
- Orchestrator/classifier: lightweight keyword + intent classifier; implemented as a FastAPI endpoint separate from agent endpoints

### Integration Requirements

| Integration | Purpose | Method |
|------------|---------|--------|
| LLM provider (default: Claude) | All agent contexts | LiteLLM — provider-agnostic |
| ChromaDB | RAG retrieval for RISK RADAR, GAP FINDER, ACTION DESK | Python `chromadb` library — local persistent store |
| Primavera XER parser | DELIVERY ENGINE schedule data | Python XER parsing library |
| XLS → CSV | VALUE LENS financial data | `pandas` / `openpyxl` → CSV preprocessing |

### Implementation Constraints

- File size hard limit: ~150 lines per file; no class hierarchies for POC; flat functions + Pydantic models only
- LiteLLM provider set via `LLM_MODEL` + `LLM_API_KEY` environment variables — switching provider requires no code change
- Pydantic models in `api/schemas/` are the canonical data contract
- KPI threshold configuration in `api/config/thresholds.json` — no code change to adjust thresholds
- No `.env` committed to repo — all secrets via environment variables

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Question classifier as routing layer**
The orchestrator classifies incoming questions by intent and routes to specialist agent contexts — without exposing the routing logic to the user. The user interacts with a single chat interface; the system decides which agent responds. This mirrors enterprise knowledge management patterns but applied to a strategy execution context where question taxonomy (schedule, financial, risk, gap, action) maps cleanly to agent capability.

**2. Grounded answers at the point of decision**
DELIVERY ENGINE and VALUE LENS use a tool-calling pattern where Python owns all data retrieval and arithmetic — the LLM narrates structured output, it never generates figures independently. This produces answers that are both readable and auditable, matching NEOM's governance requirement that financial and schedule figures be traceable to approved source systems.

**3. RAG as a domain-scoped agent pattern**
RISK RADAR, GAP FINDER, and ACTION DESK use ChromaDB retrieval with structured system prompts scoped to each agent's domain. Rather than a single general-purpose RAG interface, each agent has a specific question taxonomy and response structure — making the outputs consistent and comparable across review sessions.

**4. Static mock as a demonstration primitive**
The MSE dashboard mockup (Epic 7) demonstrates the end-state UI without requiring a live data pipeline. This is a deliberate POC technique: the visual experience of the automated MSE output is demonstrable independently of the data engineering work. Integration into the live codebase then makes the mockup progressively real.

### Validation Approach

- **Tool call accuracy:** Cross-check DELIVERY ENGINE and VALUE LENS outputs against manual queries on the same source files — values must match
- **RAG coherence:** Spot-check RISK RADAR, GAP FINDER, and ACTION DESK responses against the indexed documents for factual grounding — no figures should appear that are not present in the source documents
- **Classifier routing:** Test ≥5 question types to confirm routing to the correct agent; test ≥2 out-of-scope questions to confirm graceful degradation

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Classifier routes to wrong agent | Test coverage on boundary cases; fallback to "out of scope" response if confidence is low |
| XER parser produces incomplete schedule data | Validate parser output against known activities before wiring to DELIVERY ENGINE |
| ChromaDB retrieval returns irrelevant passages | Tune chunking and retrieval parameters; scoped system prompts reduce hallucination risk |
| RAG agent hallucinate figures | System prompt instructs agent to cite sources and decline to generate figures not present in retrieved context |

## Project Scoping

### MVP Strategy

**Approach:** Demonstration-first. Each scoping decision is made through the lens of "does this make the MSE automation case more convincing or more risky?" Features that add complexity without meaningfully changing the strategy team's experience are cut.

**Team:** Person 1 (frontend mockup — Epic 7), Person 2 (query bar → orchestrator → RAG agents, Epics 3→4→6), Person 3 (data layer → tool agents → deployment, Epics 2→5→8). 3 working days.

### Data Layer Strategy

The data layer (Epic 2) makes source documents from `data_extract/` available to agent tool calls in the format each agent requires. The dashboard is a static mock (Epic 7) and does not depend on this layer. All data parsing work exists solely to support agent responses.

| Data Source | Format | Processing | Agent Consumer |
|---|---|---|---|
| Primavera XER schedule files | Binary XER | XER parser → structured activity data | DELIVERY ENGINE |
| FY25–2040 financial model | XLS | pandas/openpyxl → CSV preprocessing | VALUE LENS |
| Strategic PDFs (MSE reports, risk docs, initiative summaries) | PDF | pypdf → ChromaDB index (chunked, embedded) | RISK RADAR, GAP FINDER, ACTION DESK |

Source documents for all three formats are available in `data_extract/`. Ingestion, schema mapping, and chunking strategy are determined during implementation.

### MVP Feature Set

**Must-have (POC fails without these):**

| Feature | Epic | Rationale |
|---------|------|-----------|
| XER parser — schedule data available to DELIVERY ENGINE | 2 | DELIVERY ENGINE cannot answer without parsed XER |
| XLS → CSV preprocessing — financial data available to VALUE LENS | 2 | VALUE LENS cannot answer without preprocessed financials |
| ChromaDB indexing of PDFs in `data_extract/` | 2 | RAG agents (RISK RADAR, GAP FINDER, ACTION DESK) require indexed documents |
| MSE dashboard mockup — KPI status, initiative tracking, BU summary | 7 | Core visual proof of MSE automation |
| Question classifier / orchestrator | 4 | Routes questions without user selecting agents |
| DELIVERY ENGINE with XER tool calls | 5 | Grounded schedule answers from real data |
| VALUE LENS with XLS-derived CSV tools | 5 | Grounded financial answers from real data |
| RISK RADAR — ChromaDB RAG | 6 | Risk domain coverage |
| GAP FINDER — ChromaDB RAG | 6 | Strategic gap domain coverage |
| ACTION DESK — ChromaDB RAG | 6 | Recommendation domain coverage |
| Agent name label on each response | 4 | Surfaces classifier routing to user |
| Local run: `pnpm dev` + `uvicorn` | 8 | Non-negotiable for local demonstration |

**Explicitly out of POC scope:**

- What-if scenario engine (Gantt simulation)
- Action recommendation cards + PIF generation
- Agent menu with user selection
- Confidence traffic light
- TTS / voice reading
- iPad-optimized layout as primary requirement
- In-app authentication
- Database
- Multi-agent chained workflows

### Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| XER parser integration complexity | Medium | Spike on Day 1; fallback is pre-parsed JSON fixtures for DELIVERY ENGINE |
| ChromaDB indexing produces poor retrieval | Medium | Tune chunk size and top-k; test retrieval before wiring to agents |
| Classifier routes incorrectly at demo | Low | Pre-test all expected question types; graceful "out of scope" fallback |
| 3 days insufficient for all 5 agents | High | DELIVERY ENGINE + VALUE LENS are the demo core; RAG agents are thinner and can be delivered as structured prompts without full ChromaDB if time is constrained |

## Functional Requirements

### Agent Data Ingestion (Epic 2)

- **FR1:** The system can parse Primavera XER schedule files, XLS financial model files, and strategic PDF documents from `data_extract/` to make their contents available to agent tool calls — each source format is parsed independently; parsing success is confirmed when the corresponding agent can invoke a tool call and return source-grounded data

### KPI Dashboard & Visualization (Epic 2)

- **FR4:** Users can view KPI scorecards for each active BU (Phosphate, Aluminum, Gold, Copper) showing actuals vs. plan vs. 2030/2040 targets
- **FR5:** The system can classify each KPI as on-track, at-risk, or off-track based on configurable deviation thresholds
- **FR6:** Users can view trend charts for production volumes, capex burn, leverage ratio, and EBITDA contribution per BU
- **FR7:** Users can navigate between individual BU views and a consolidated corporate view
- **FR8:** Users can filter the dashboard by time period

### AI Analysis & Suggested Interrogations (Epic 3)

- **FR9:** The system can generate and display an AI narrative headline per BU section — the headline must reference at least one specific KPI value and name the primary driver (e.g. production shortfall, capex overrun, schedule slip)
- **FR10:** The system can surface ≥3 context-aware suggested interrogations relevant to the current dashboard state
- **FR11:** Users can select a suggested interrogation to pre-populate the query bar

### Conversational Query Interface (Epic 3)

- **FR12:** Users can submit natural language questions about in-scope dashboard data and receive answers that cite specific data points from the loaded source documents
- **FR13:** The system can invoke available data tools to answer in-scope queries
- **FR15:** Users can continue a conversation across multiple turns within a single session

### Platform & Navigation (Epic 1)

- **FR16:** Users can navigate between all cockpit sections from a persistent sidebar
- **FR17:** Platform access is controlled at the infrastructure level — no in-application authentication layer is required
- **FR18:** Users can access all cockpit sections from a single session without page reload
- **FR19:** The LLM provider is configurable without application code changes — switching providers requires only a configuration update

### Orchestrator / Classifier (Epic 4)

- **FR20:** The system can classify an incoming user question into one of five agent contexts — DELIVERY ENGINE, VALUE LENS, RISK RADAR, GAP FINDER, or ACTION DESK — using a keyword and intent classifier
- **FR21:** The system routes each classified question to the appropriate agent context and returns a response labelled with the originating agent name (e.g. "Answered by DELIVERY ENGINE")
- **FR22:** If the system cannot identify a matching agent context for the incoming question, it returns a clear explanation that the question is outside its current scope — no agent is invoked and no figures are generated; verifiable by submitting ≥2 out-of-scope questions and confirming that no agent name appears in the response and no numerical data is fabricated

### DELIVERY ENGINE (Epic 5)

- **FR23:** DELIVERY ENGINE can answer schedule and velocity questions by invoking tools that parse Primavera XER files for all 4 BUs — returning current activity schedules, RAG status, baseline vs. actual dates, and delay metrics grounded in the source data
- **FR24:** DELIVERY ENGINE responses cite ≥2 specific schedule data points (e.g. delayed activity name, RAG status, days behind baseline) drawn from the XER-derived tool output

### VALUE LENS (Epic 5)

- **FR25:** VALUE LENS can answer financial questions by invoking tools that read XLS-derived CSV files — returning EBITDA, capex, and production time series by BU and year grounded in the approved FY25–2040 financial model
- **FR26:** VALUE LENS responses cite ≥2 specific financial data points (e.g. EBITDA delta by year, capex variance) drawn from the XLS-derived tool output

### RAG-Based Agents (Epic 6)

- **FR27:** RISK RADAR can answer questions about project and strategic risks by retrieving relevant passages from ChromaDB-indexed PDF documents and generating a structured response scoped to NEOM's risk taxonomy — the response must cite the source document by name and must not contain numerical figures that are not present in the retrieved context
- **FR28:** GAP FINDER can answer questions about gaps between planned and actual strategic outcomes by retrieving relevant passages from ChromaDB-indexed PDF documents and generating a structured response identifying specific gaps and their magnitude — the response must cite the source document by name
- **FR29:** ACTION DESK can answer questions about recommended actions and next steps by retrieving relevant passages from ChromaDB-indexed PDF documents and generating a structured, action-oriented response — the response must cite the source document by name

### MSE Dashboard Mockup (Epic 7)

- **FR30:** The MSE dashboard renders static content from a hardcoded JSON data file, visually replicating the structure of the Monthly Strategy Execution review output — KPI status by BU, initiative tracking status, and BU performance summary — with no data loading or network dependency
- **FR31:** Users can navigate to the MSE dashboard view from the main navigation shell and access all static content without any loading delay

### Local Deployment (Epic 8)

- **FR32:** The complete system starts locally with two commands — `pnpm dev` (Next.js frontend, port 3000) and `uvicorn api.main:app --reload` (FastAPI backend, port 8000) — with no additional services, cloud credentials, or external dependencies required for local operation

## Non-Functional Requirements

### Performance

- **NFR1:** Dashboard cold load time: <3 seconds on standard corporate WiFi (first paint to interactive)
- **NFR2:** Agent response end-to-end time: <15 seconds from submission to displayed output for tool-based agents (DELIVERY ENGINE, VALUE LENS)
- **NFR3:** LLM query bar: first token streamed within 3 seconds of submission
- **NFR4:** Navigation between module views: <500ms

### Security

- **NFR5:** No unauthenticated route is exposed — all platform access requires authentication at the infrastructure level
- **NFR6:** No external analytics, logging, or telemetry SDKs — this constraint targets passive data leakage via third-party observability tools, not agent-initiated retrieval of publicly available information
- **NFR7:** LLM API key and all secrets stored as environment variables — never committed to the source repository
- **NFR8:** No sensitive financial data persisted beyond the session — data files are read-only at runtime

### Integration

- **NFR9:** LLM provider switchable via configuration with no application code changes — provider abstraction enforced throughout
- **NFR10:** FastAPI backend is callable from the Next.js frontend without external network dependency when running locally
- **NFR11:** Data file formats in `data_extract/` are treated as versioned inputs — adding or replacing a source file (XER, XLS, or PDF) does not require a code deployment; only reprocessing of the affected format is needed

### Reliability

- **NFR12:** Platform can be deployed to a stable URL for remote demonstration — local run (`pnpm dev` + `uvicorn`) is the primary development and demonstration target
- **NFR13:** If an agent tool invocation fails, the UI displays a clear error state — no silent failures, no empty outputs
- **NFR14:** If the LLM provider is unavailable, the dashboard remains fully functional — LLM-dependent features degrade gracefully without crashing the application

### Deployment

- **NFR15:** The complete system starts and runs fully locally with two commands — `pnpm dev` (Next.js frontend, port 3000) and `uvicorn api.main:app --reload` (FastAPI backend, port 8000) — no cloud service is required for local operation
