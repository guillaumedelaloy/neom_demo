---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
lastUpdated: '2026-04-15'
updateNote: >
  Major reframe — sprint change proposal 2026-04-13. Old Epics 4–7 (What-If,
  Action Rec, CEO Cockpit, TTS/iPad) removed. New Epics 4–8 added (Connect Agent
  to Data Layer, Tool-Based Agents, RAG-Based Agents, Frontend Mockup Integration,
  Deployment Setup). Requirements Inventory updated to reflect new FR20–FR32 and
  removal of FR2, FR3, FR14, FR20–FR42 (old). Epics 1–3 preserved as-is. 2026-04-15
  backfill: add cross-cutting response-governance notes for raw-file citations,
  confidence/ambiguity handling, corroboration, conditional strategy-doc use,
  consolidation-before-not_supported, and Opus default model.
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-13.md
  - _bmad-output/planning-artifacts/product-brief-neom_demo.md
---

# neom_demo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the NEOM Strategy Execution AI, decomposing the requirements from the PRD and Architecture into implementable stories. Scoped for a **3-day POC** — static MSE dashboard mock + AI chat with five-agent classifier routing. Two agents (DELIVERY ENGINE, VALUE LENS) built to real tool depth; three (RISK RADAR, GAP FINDER, ACTION DESK) via ChromaDB RAG. Demo-stable by Day 3.

**Epics 1–3 are complete.** New work begins at Epic 4.

---

## Requirements Inventory

### Functional Requirements

FR1: The system can parse Primavera XER schedule files, XLS financial model files, and strategic PDF documents from `data_extract/` to make their contents available to agent tool calls — each source format is parsed independently; parsing success is confirmed when the corresponding agent can invoke a tool call and return source-grounded data
FR4: Users can view KPI scorecards for each active BU (Phosphate, Aluminum, Gold, Copper) showing actuals vs. plan vs. 2030/2040 targets
FR5: The system can classify each KPI as on-track, at-risk, or off-track based on configurable deviation thresholds
FR6: Users can view trend charts for production volumes, capex burn, leverage ratio, and EBITDA contribution per BU
FR7: Users can navigate between individual BU views and a consolidated corporate view
FR8: Users can filter the dashboard by time period
FR9: The system can generate and display an AI narrative headline per BU section citing a specific KPI value and primary driver
FR10: The system can surface ≥3 context-aware suggested interrogations relevant to the current dashboard state
FR11: Users can select a suggested interrogation to pre-populate the query bar
FR12: Users can submit natural language questions and receive answers citing specific data points from loaded source documents
FR13: The system can invoke available data tools to answer in-scope queries
FR15: Users can continue a conversation across multiple turns within a single session
FR16: Users can navigate between all module views from a persistent sidebar
FR17: Platform access is controlled at the infrastructure level — no in-application authentication layer required
FR18: Users can access all platform sections from a single session without page reload
FR19: The LLM provider is configurable without application code changes — switching requires only a configuration update
FR20: The system classifies each incoming question and routes it to one of five agent contexts: DELIVERY ENGINE, VALUE LENS, RISK RADAR, GAP FINDER, or ACTION DESK
FR21: Every agent response is labelled with the name of the agent that produced it (e.g. "Answered by DELIVERY ENGINE")
FR22: If the system cannot identify a matching agent context for the incoming question, it returns a clear explanation that the question is outside its current scope — no agent is invoked and no figures are generated; verifiable by submitting ≥2 out-of-scope questions and confirming that no agent name appears in the response and no numerical data is fabricated
FR23: DELIVERY ENGINE answers schedule and velocity questions using structured tool calls against parsed Primavera XER data — the LLM generates no numerical schedule values directly
FR24: DELIVERY ENGINE responses cite ≥2 specific data points from the XER source (activity name, planned finish, float, or delay delta) with the source identified
FR25: VALUE LENS answers financial questions using structured tool calls against XLS-derived CSV data — the LLM generates no numerical financial values directly
FR26: VALUE LENS responses cite ≥2 specific data points from the financial model source (metric name, value, year, BU) with the source identified
FR27: RISK RADAR answers risk and resilience questions using context retrieved from ChromaDB-indexed strategy PDFs; responses cite the source document and section; the agent does not generate risk figures outside retrieved context
FR28: GAP FINDER answers coverage gap and white-spot questions using ChromaDB-retrieved context; responses cite source documents; the agent does not assert gaps that are not evidenced in retrieved content
FR29: ACTION DESK answers accountability and action-tracking questions using ChromaDB-retrieved context; responses cite source documents; the agent does not assert ownership or deadlines not present in retrieved content
FR30: The MSE dashboard renders static MSE-equivalent content from a JSON file with no network dependency — sections mirror the MSE PowerPoint structure (KPI Status, Initiative Tracker, BU Performance, Risk Highlights)
FR31: The MSE dashboard is navigable from the main navigation shell without page reload
FR32: The full system starts locally with two commands: `pnpm dev` (Next.js frontend) and `uvicorn api.main:app --reload` (FastAPI backend) — no additional configuration required beyond `.env.local`

### Non-Functional Requirements

NFR1: Dashboard cold load time <3 seconds on standard corporate WiFi (first paint to interactive)
NFR2: Agent response (tool-based) end-to-end time <15 seconds from submission to displayed output
NFR3: LLM query bar first token streamed within 3 seconds of submission
NFR4: Navigation between views: <500ms
NFR5: No unauthenticated route is exposed — all platform access requires authentication at the infrastructure level
NFR6: No external analytics, logging, or telemetry SDKs — this constraint targets passive data leakage via third-party observability tools, not agent-initiated retrieval of publicly available information
NFR7: LLM API key and all secrets stored as environment variables — never committed to the source repository
NFR8: No sensitive financial data persisted beyond the session — data files are read-only at runtime
NFR9: LLM provider switchable via configuration with no application code changes
NFR10: Agent tool functions are callable without external network dependency — XER parser, CSV tools, and ChromaDB all run locally
NFR11: Data file formats in `data_extract/` are treated as versioned inputs — adding or replacing a source file (XER, XLS, or PDF) does not require a code deployment; only reprocessing of the affected format is needed
NFR12: Platform can be deployed to a stable URL for demo access — local environment not required for the demo session
NFR13: If an agent tool call fails, the UI displays a clear error state — no silent failures or empty outputs
NFR14: If the LLM provider is unavailable, the static dashboard and MSE mock remain fully functional — LLM features degrade gracefully
NFR15: The full system starts locally with two commands and no cloud configuration — `pnpm dev` and `uvicorn api.main:app --reload` are sufficient to run all five agents and the MSE dashboard

### Additional Requirements (from Architecture)

- **Stack:** Next.js App Router + Tailwind CSS v4 + NEOM Industrial Mineral design system (`--ma-*`/`--ai-*` tokens, IBM Plex Sans) + Zustand (frontend); FastAPI + Python 3.11 + LiteLLM (backend). shadcn/ui OKLCH tokens replaced.
- **Package manager:** `pnpm`
- **Backend runtime:** FastAPI via `uvicorn`, local-first — deployable to GCP Cloud Run
- **Vector store:** ChromaDB (local, no cloud dependency)
- **Data sources:** Primavera XER (XER parser → `xerparser`), XLS financial model (openpyxl, data_only=True → CSV), strategy PDFs (pypdf → ChromaDB)
- **LLM abstraction:** LiteLLM in `api/services/llm_client.py` — all LLM calls route through this; provider set via `LLM_MODEL` + `LLM_API_KEY` env vars; default `LLM_MODEL=anthropic/claude-opus-4-6`
- **Streaming:** FastAPI `StreamingResponse` (SSE) → Next.js `ReadableStream` → React streaming UI
- **File size hard limit:** ~150 lines per file; flat functions + Pydantic models only; no class hierarchies for POC
- **Official project names throughout:** Ma'aden, Phos-4, Phos-5 — no generic placeholders
- **Response contract:** Answers are concise by default, cite original raw source files rather than tools or processed artefacts, use confidence/ambiguity sections only when relevant, and surface corroboration or source-of-truth decisions when multiple sources are involved

### UX Design Requirements

- NEOM Industrial Mineral design language (ported from `repo_design/`): warm stone page background (`#f4f1ea`), charcoal nav (`#1a1c1b`) always dark, mineral gold nav accent (`#b8956a`), teal data/CTAs (`#2d6a66`), AI chrome (`#0e0f10`). IBM Plex Sans font. Full token and component spec in `_bmad-output/planning-artifacts/design-system.md`.
- Clean, professional executive UI — no debug state surfaces, no "demo mode" watermarks
- Agent identity badge visible in every chat response — typography from design system
- All platform sections reachable from a single navigation flow without page reload

### FR Coverage Map

FR1: Epic 2 — parse XER, XLS, and PDF source formats for agent tool calls
FR4: Epic 2 — KPI scorecards for 4 BUs with actuals vs. plan vs. targets
FR5: Epic 2 — KPI classification (on_track / at_risk / off_track) via configurable thresholds
FR6: Epic 2 — trend charts (production, capex, leverage, EBITDA)
FR7: Epic 2 — BU view + consolidated corporate view navigation
FR8: Epic 2 — time period filter on dashboard
FR9: Epic 3 — AI narrative headline per BU citing specific KPI value and driver
FR10: Epic 3 — ≥3 context-aware suggested interrogations per BU state
FR11: Epic 3 — select interrogation to pre-populate query bar
FR12: Epic 3 — natural language query bar grounded in source documents
FR13: Epic 3 — data tool invocation to answer in-scope queries
FR15: Epic 3 — multi-turn conversation within a session
FR16: Epic 1 — persistent sidebar navigation
FR17: Epic 1 — infrastructure-level access control (no in-app auth)
FR18: Epic 1 — all sections accessible from one session without page reload
FR19: Epic 3 (Story 3.1) — LiteLLM client implements provider abstraction; env var scaffolding in Story 1.1
FR20: Epic 4 — classifier routes question to correct agent context
FR21: Epic 4 — response labelled with agent name
FR22: Epic 4 — out-of-scope questions return explanation with no agent invoked and no figures generated
FR23: Epic 5 — DELIVERY ENGINE answers schedule questions using XER tool calls
FR24: Epic 5 — DELIVERY ENGINE response cites ≥2 XER data points
FR25: Epic 5 — VALUE LENS answers financial questions using XLS/CSV tool calls
FR26: Epic 5 — VALUE LENS response cites ≥2 financial model data points
FR27: Epic 6 — RISK RADAR answers via ChromaDB RAG + source citation
FR28: Epic 6 — GAP FINDER answers via ChromaDB RAG + source citation
FR29: Epic 6 — ACTION DESK answers via ChromaDB RAG + source citation
FR30: Epic 7 — MSE dashboard renders from JSON with no network dependency
FR31: Epic 7 — MSE dashboard navigable from main navigation shell
FR32: Epic 8 — two-command local startup

---

## Epic List

### Epic 1: Foundation & Stakeholder Validation ✅

Stakeholders can open a deployed URL showing real NEOM branding and representative KPI data, evaluate the UI direction and information architecture, and confirm (or correct) the trajectory before implementation investment begins.
**FRs covered:** FR16, FR17, FR18, FR19

### Epic 2: Data Layer + KPI Dashboard 🔄

Executives can view accurate KPI scorecards, trend charts, and BU performance summaries drawn from real operational documents in `data_extract/`. Data parsing infrastructure (XER, XLS/CSV, PDF) is established as the foundation for agent tool calls in Epics 5–6.
**FRs covered:** FR1, FR4, FR5, FR6, FR7, FR8

### Epic 3: AI Query Bar 🔄

Executives can ask natural language questions about dashboard data and receive grounded, accurate answers in real time. Responses are concise by default, cite original raw files, and attempt a final consolidation before falling back to `not_supported`. AI headlines and suggested interrogations guide the conversation before it starts.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR15, FR19

### Epic 4: Connect Agent to Data Layer

The Epic 3 query bar is wired to a classifier that routes each question to the correct agent context. Agent identity is visible in every response. Out-of-scope questions return a clear explanation — no hallucinated figures.
**FRs covered:** FR20, FR21, FR22

### Epic 5: Tool-Based Agents (DELIVERY ENGINE + VALUE LENS)

DELIVERY ENGINE answers schedule questions using parsed Primavera XER data. VALUE LENS answers financial questions using XLS-derived CSV tools. Both agents cite source data in every response and never generate numbers independently of their tools.
**FRs covered:** FR23, FR24, FR25, FR26

### Epic 6: RAG-Based Agents (RISK RADAR + GAP FINDER + ACTION DESK)

Three agents answer their respective question domains using ChromaDB-indexed strategy PDFs and structured system prompts. Quality is driven by prompt engineering and retrieval tuning. Strategy documents are used when they materially improve the answer, every response cites original source documents, and no figures are generated outside retrieved context.
**FRs covered:** FR27, FR28, FR29

### Epic 7: Frontend Mockup Integration

A static MSE dashboard mockup — built separately from the agent layer — is wired into the main Next.js codebase. The mockup mirrors the MSE PowerPoint structure using hardcoded JSON data and requires no API calls.
**FRs covered:** FR30, FR31

### Epic 8: Deployment Setup

GCP Cloud Run configuration, Docker container for the FastAPI backend, environment variable parity between local `.env` and GCP secrets, Vercel frontend deployment, and end-to-end smoke test across both local and deployed environments.
**FRs covered:** FR32, NFR12, NFR15

---

## Epic 1: Foundation & Stakeholder Validation

**Goal:** By end of Day 1, a deployed Vercel URL shows a visually complete interface — NEOM branding, full navigation, and hardcoded-but-realistic KPI scorecards — so stakeholders can react to the UI direction, information architecture, and use case framing before the team invests Days 2–3 building on top of it.

### Story 1.1: Project Initialization and Repository Setup

As a developer,
I want the Next.js + FastAPI project scaffolded with correct tooling and structure,
So that all engineers start from an identical, working base without setup friction.

**Acceptance Criteria:**

**Given** an empty repository,
**When** the initialization commands are run,
**Then** `npx create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, and `@/*` import alias produces a running frontend
**And** `npx shadcn@latest init` initializes the component library
**And** `api/` directory exists with `index.py` (FastAPI entrypoint), `routers/`, `services/`, `schemas/` subdirectories
**And** `requirements.txt` contains: `fastapi`, `uvicorn`, `litellm`, `pydantic`, `python-multipart`, `pandas`, `openpyxl`, `pypdf`, `python-pptx`, `sentence-transformers`, `chromadb`, `xerparser`
**And** `pnpm` is the package manager — no `npm` or `yarn` lock files committed
**And** `.env.local` is gitignored; `LLM_MODEL` and `LLM_API_KEY` are documented in `.env.example` only

---

### Story 1.2: Full UI Shell with Hardcoded KPI Data for Stakeholder Review

As a stakeholder (BCG partner, SEO director, or executive),
I want to open a deployed URL and see a visually complete dashboard with real NEOM branding and representative KPI data,
So that I can validate the UI direction, information architecture, and use case framing before real data integration begins.

**Acceptance Criteria:**

**Given** the deployed Vercel URL is opened in a desktop browser,
**When** the page loads,
**Then** initial paint occurs in <3 seconds on standard WiFi (NFR1 baseline)
**And** the NEOM Industrial Mineral design language is applied — warm stone page background, charcoal sidebar (always dark), mineral gold nav accent, teal data accent; no default light/dark theme or generic blue; layout matches Benchmark Intelligence aesthetic (see `_bmad-output/planning-artifacts/design-system.md`)
**And** a persistent dark sidebar is present; navigation covers the KPI dashboard, MSE Review, and AI chat views
**And** the KPI Framework view renders four BU scorecards (Phosphate, Aluminum, Gold, Copper) with hardcoded-but-plausible KPI values — actuals, plan, and status indicators (teal/amber/risk)
**And** at least one hardcoded trend chart (line or bar) is visible to validate the chart layout and readability
**And** a functional AI query bar is visible inline above page content (QueryBar + InsightDrawer pattern with seeded NEOM preset responses)
**And** navigation between any two views completes in <500ms (NFR4)
**And** no debug state, stack trace, console error, or "demo mode" watermark is visible

**Note:** All data in this story is hardcoded. The explicit purpose is stakeholder feedback. Real data integration begins in Epic 2.

---

### Story 1.3: Stakeholder Alignment Checkpoint

As a BCG engagement partner,
I want to walk stakeholders through the deployed Day 1 UI and capture their feedback on direction,
So that any misalignment on use case, layout, or information hierarchy is corrected before Days 2–3 are spent building the wrong thing.

**Acceptance Criteria:**

**Given** Story 1.2 is deployed and accessible via the stable Vercel URL,
**When** the checkpoint session occurs (async review or live walkthrough),
**Then** stakeholders can access the URL independently — no local setup required
**And** the following questions are explicitly put to stakeholders and answers recorded:
  - Does the BU scorecard layout communicate performance status clearly at a glance?
  - Is the navigation model (sidebar) the right entry point for an executive user?
  - Does the positioning of the query bar feel natural for an executive user?
  - Are the KPI labels and terminology correct (e.g. "Leverage ratio", "EBITDA contribution")?
  - Is there any capability visible that should not be in the POC, or any missing that should be?
**And** feedback is captured as written notes or recorded — not just verbal
**And** any layout or terminology changes identified are scoped and either incorporated before Epic 2 begins or explicitly deferred with a recorded rationale
**And** the team does not begin Epic 2 story implementation until this checkpoint is complete or explicitly waived

**Note:** This is a process gate, not a software deliverable. Acceptance is: feedback captured, go/no-go decision made, changes (if any) scoped.

---

## Epic 2: Data Layer + KPI Dashboard

**Goal:** Replace placeholder content with real KPI data from `data_extract/`. Executives can view accurate KPI scorecards, trend charts, and BU navigation backed by actual operational documents. The parsing infrastructure built here (pandas/openpyxl for Excel/CSV) forms the foundation extended in Epic 5 for agent-facing XER and financial model tools.

### Story 2.1: Track A Data Parsers and KPI Schema

As a developer,
I want parsers for Excel/CSV source documents and validated Pydantic schemas,
So that all downstream services receive clean, typed data without ad hoc parsing scattered across the codebase.

**Acceptance Criteria:**

**Given** source documents exist in `data_extract/` for the KPI dashboard,
**When** `data_loader.py` runs,
**Then** it reads Excel/CSV files using `pandas`/`openpyxl` and returns typed Pydantic models defined in `api/schemas/modules.py`
**And** schema definitions cover at minimum: BU code (locked values: `phosphate`, `aluminum`, `gold`, `copper`), KPI name, actual value, plan value, target 2030, target 2040, unit, period
**And** a schema version field is present in each module schema — updating it requires only a data file change, not a code change (NFR11)
**And** `data_loader.py` is ≤150 lines; parsing logic for each module lives in its own function
**And** if a source file is missing or malformed, the loader raises a specific exception with a meaningful message — no bare `except: pass`

---

### Story 2.2: KPI Scoring Engine and Threshold Configuration

As an SEO analyst,
I want each KPI automatically classified as on-track, at-risk, or off-track against configurable thresholds,
So that deviation detection requires no manual calculation.

**Acceptance Criteria:**

**Given** `api/config/thresholds.json` defines per-KPI deviation bands (on_track / at_risk / off_track),
**When** `kpi_engine.py` processes a module's Pydantic model,
**Then** each KPI is tagged with status: `on_track`, `at_risk`, or `off_track` (no other values)
**And** threshold adjustments require only editing `thresholds.json` and redeploying — no Python changes
**And** `GET /api/kpi/{bu}` returns the scored KPI list for the requested BU in <500ms (NFR4)
**And** `kpi_engine.py` is ≤150 lines

---

### Story 2.3: KPI Scorecards and Trend Charts UI

As an executive,
I want to see KPI scorecards with actual vs. plan for each BU and trend charts for key metrics,
So that I can assess BU performance at a glance without opening any spreadsheet.

**Acceptance Criteria:**

**Given** the KPI API endpoint returns scored data for a BU,
**When** I navigate to a BU view,
**Then** KPI scorecards display: KPI name, actual value, plan value, 2030/2040 targets, and a status indicator (color-coded: green = on_track, amber = at_risk, red = off_track)
**And** trend charts render for production volumes, capex burn, leverage ratio, and EBITDA contribution using Recharts
**And** a time period filter (e.g. YTD, Q1, Q2…) is present and updates the displayed data
**And** a consolidated corporate view aggregates all 4 BUs on a single screen
**And** switching between BU views completes in <500ms (NFR4)
**And** no financial data is persisted client-side beyond the current session (NFR8)

---

## Epic 3: AI Query Bar

**Goal:** LLM is wired in. Executives can ask questions about dashboard data and receive accurate, grounded answers — or a graceful "not supported" when the question is out of scope. AI headlines and suggested interrogations guide the conversation before it starts.

### Story 3.1: LiteLLM Client and Provider Configuration

As a developer,
I want a single LiteLLM wrapper that all backend LLM calls route through,
So that switching providers requires only changing an environment variable — no application code changes.

**Acceptance Criteria:**

**Given** `LLM_MODEL` and `LLM_API_KEY` are set as environment variables,
**When** any backend service calls `llm_client.py`,
**Then** the call routes through LiteLLM using the configured model — default `claude-sonnet-4-6`
**And** changing `LLM_MODEL` to `gpt-4o` or any LiteLLM-supported model requires zero application code change (FR19, NFR9)
**And** `llm_client.py` is ≤150 lines and contains no business logic — provider abstraction only
**And** the API key is never logged, never returned in any API response, and never committed to the repository (NFR7)
**And** if the LLM provider is unavailable, the failure is caught and returned as `{"error": "LLM unavailable", "code": "LLM_UNAVAILABLE"}` — the static dashboard continues to function (NFR14)

---

### Story 3.2: AI Narrative Headlines and Suggested Interrogations

As an executive,
I want an AI-generated headline for each BU that names a specific KPI issue, and suggested questions I can click to explore further,
So that I immediately understand what matters without having to interpret raw numbers.

**Acceptance Criteria:**

**Given** a BU's scored KPI data is loaded,
**When** the BU dashboard renders,
**Then** one AI narrative headline is displayed per BU that references at least one specific KPI value and names the primary driver
**And** ≥3 context-aware suggested interrogations are displayed below the headline, relevant to the current BU state
**And** each suggested interrogation is answerable by the available data tools — the LLM is prompted to only suggest questions within tool scope (with at most one labeled `[Future capability]`)
**And** clicking a suggested interrogation pre-populates the query bar input field
**And** headlines and interrogations are generated server-side and cached per BU load — no re-generation on tab switch

---

### Story 3.3: Conversational Query Bar with Tool Calling and Graceful Degradation

As an executive,
I want to type any question into a query bar and get an accurate answer grounded in the loaded data — with a partial but honest answer when evidence is incomplete and `not_supported` only as a last resort,
So that I can ask unscripted questions during the meeting without risking a hallucinated answer.

**Acceptance Criteria:**

**Given** the query bar is visible and data tools have access to structured KPI data,
**When** I submit an in-scope question,
**Then** the first token streams to the UI within 3 seconds (NFR3)
**And** the answer cites specific data points from the loaded source documents (FR12)
**And** the conversation persists across multiple turns within the session (FR15)

**Given** I submit a question outside available data scope,
**When** routing or validation determines the system cannot answer groundedly,
**Then** the response is a clear `not_supported` explanation naming what data or scope is missing
**And** the response never contains a hallucinated number or fabricated data point

**Given** an in-scope question consumes its tool-call budget or the model returns empty content,
**When** the runtime has already gathered some useful evidence,
**Then** the system makes one consolidation attempt before returning `not_supported`
**And** any resulting answer is clearly caveated rather than silently dropped
**And** no external analytics or telemetry SDK receives any query content (NFR6)

---

### Story 3.4: Query Bar Agent Router

As a developer,
I want `POST /api/query` to classify incoming queries against a registry of named analytical agents and route each query to the appropriate agent's system prompt — or return a structured "out of scope" response when no agent matches,
So that the query bar gives focused, relevant answers and honestly signals when a question is outside its current capabilities.

**Acceptance Criteria:**

**Given** `api/services/router_service.py` defines five agents (Risk Radar, Delivery Engine, Value Lens, Gap Finder, Action Desk) each with a `system_prompt` and `keywords` list,
**When** `route_query(text: str)` is called,
**Then** it returns the first agent whose keywords appear in the lowercased query, or `None` if no agent matches

**Given** a query is submitted to `POST /api/query`,
**When** `route_query` returns a matched agent,
**Then** `agent_service.stream_agent_response` uses that agent's `system_prompt` instead of the default `_SYSTEM` prompt — all other behaviour (tool calling, SSE format, max rounds) is unchanged

**Given** a query is submitted to `POST /api/query`,
**When** `route_query` returns `None` (no agent matches),
**Then** the endpoint immediately emits `{"type": "not_supported", "content": "..."}` listing what each agent can help with — no LLM call is made

**And** `router_service.py` is ≤120 lines; no frontend files are touched; the `/api/query` request/response contract is unchanged

**Note:** Workstream C (Agent Layer, Python backend). No frontend changes. Extends Story 3.3's `agent_service.py`.

---

### Story 3.5: Pre-Generation Answer Validator

As a developer,
I want a pre-generation validator that runs before the main LLM call and determines whether the selected agent has sufficient data and knowledge to answer the query,
So that every response is either honestly blocked with an explanation of what's missing, or transparently qualified with the caveats and assumptions baked into the answer.

**Acceptance Criteria:**

**Given** an agent has been selected by the router and a query is submitted,
**When** the validator determines the agent cannot give a grounded answer,
**Then** `not_supported` is emitted immediately with the reason and what data would be needed — no main LLM call is made

**Given** the validator determines the agent can answer,
**When** it identifies limitations or assumptions,
**Then** those caveats are injected into the system prompt so they appear transparently in the streamed response

**Given** the validator itself fails (LLM unavailable, parse error),
**Then** the query proceeds with a single fallback caveat — validation failure does not block the user

**And** `validator_service.py` is ≤40 lines; no files outside `api/` are touched

**Note:** Workstream C (Agent Layer, Python backend). Depends on Story 3.4 (agent must be selected before validation runs). Available data description in `validator.md` is hardcoded for now — made dynamic in a future story.

---

### Story 3.6: Skill-Level Routing

As a developer,
I want the router to resolve both the agent and the specific skill needed to answer a query in a single LLM call, check whether that skill is implemented before proceeding, and emit the matched agent's identity as the first event in the SSE stream,
So that capability is tracked at the skill level and the frontend always knows which agent is answering — enabling the UI to present the response as coming from that specific agent.

**Acceptance Criteria:**

**Given** a query is submitted,
**When** the router resolves both an agent and a specific skill in a single LLM call,
**Then** if the skill is `implemented: false`, a `not_supported` response is emitted naming the skill and listing any skills in that agent that ARE implemented

**Given** the skill is implemented,
**When** the stream begins,
**Then** the first SSE event is `{"type": "agent", "agent_id": "...", "content": "<label>"}` — before any token events

**Given** no agent or skill matches,
**Then** the existing out-of-scope message is returned — behaviour unchanged from Story 3.4

**And** all skill definitions live in `api/agents.yaml`; activating a skill requires only setting `implemented: true` — no code change
**And** `agent_registry.py` remains ≤80 lines; no files outside `api/` are touched

**Note:** Workstream C (Agent Layer, Python backend). All skills start as `implemented: false`. The `agent` SSE event is for workstream B (frontend) to consume and display the agent label in the drawer.

---

### Story 3.7: Response Trust Contract in Agent Answers

As a leadership user,
I want every agent response to cite original raw sources and explain trust signals only when they are material,
So that I can judge what to trust without turning every answer into a verbose report.

**Acceptance Criteria:**

**Given** an agent completes a response,
**When** the answer is based on tool or retrieval results,
**Then** the response cites the original raw file (XER, XLSX, PDF, or PPTX) rather than tool names or processed artefacts

**Given** an answer uses retrieved data or explicit analysis,
**When** confidence or ambiguity materially affects trust,
**Then** the response includes concise textual confidence and ambiguity guidance rather than a UI confidence widget

**Given** a claim plausibly exists in multiple catalogue sources,
**When** at least two sources are available,
**Then** the agent cross-checks them, notes corroboration when they agree, and names the source of truth when they conflict

**Given** a strategy document could add qualitative context,
**When** the answer is primarily about schedule status, dates, or financial figures,
**Then** strategy-document context is used only when it materially improves the answer and never overrides the higher-authority structured source

**Note:** Workstream C. This is implemented primarily through prompt-template and data-catalogue guidance, not a fixed programmatic citation footer.

---

**⚠ Agent naming mismatch:** The agent names used in this story (Risk Radar, Delivery Engine, Value Lens, Gap Finder, Action Desk) differ from the product brief, which uses "Project Delay Impact", "Project Risk Assessment", etc. The product brief is expected to be updated to align with these names before the Epic 6 demo. Do not edit the product brief until that decision is confirmed.

---

=======
## Epic 4: Connect Agent to Data Layer

**Goal:** The Epic 3 query bar is upgraded from a single-context agent to a classifier-routed system. Every question is classified and routed to one of five named agent contexts. Agent identity is visible in the response. Out-of-scope questions are handled gracefully — no hallucinated answers, no agent invoked. This epic is the integration bridge between the shell (Epic 3) and the full agent implementations (Epics 5–6).

### Story 4.1: Question Classifier and Agent Router

As a developer,
I want a backend classifier that routes each incoming question to the correct agent context,
So that the orchestrator — not the user — decides which agent handles each question.

**Acceptance Criteria:**

**Given** `POST /api/query` receives a natural language message,
**When** the classifier runs,
**Then** it determines which of the five agent contexts applies:
  - **DELIVERY ENGINE** — schedule velocity, milestone status, critical path, delay impact
  - **VALUE LENS** — financial performance, capex tracking, EBITDA impact, financial what-if
  - **RISK RADAR** — risk exposure, timeline credibility, portfolio stress-testing
  - **GAP FINDER** — coverage gaps, board commitments, white spots, what is not being tracked
  - **ACTION DESK** — open actions, overdue commitments, accountability, stalled decisions
**And** if no agent context matches, the classifier returns `agent_id: null` and a user-facing explanation that the question is outside the current scope — no agent system prompt is invoked and no figures are generated (FR22)
**And** the classifier decision is logged server-side with the question hash (no question text logged) for debugging
**And** the classifier is implemented as a single LLM call with a structured output schema — not a keyword matcher
**And** `api/services/classifier.py` is ≤100 lines

---

### Story 4.2: Agent Identity in Chat UI

As an executive,
I want every chat response to show which agent answered it,
So that I understand the analytical lens being applied and can calibrate my trust accordingly.

**Acceptance Criteria:**

**Given** the classifier has routed a question to an agent and the response is complete,
**When** the response renders in the chat UI,
**Then** an agent identity badge is displayed with the agent name (e.g. "Answered by DELIVERY ENGINE")
**And** the badge uses consistent typography and colour from the NEOM Industrial Mineral design system — distinct from body text but not distracting
**And** out-of-scope questions display "Outside current scope" with no agent badge and no numerical content
**And** the agent badge is visible without scrolling — positioned adjacent to or above the response text
**And** `AgentBadge.tsx` is a standalone component ≤60 lines accepting `agentId: string | null` as its only prop

---

### Story 4.3: Data Catalogue

As a developer,
I want a single human- and LLM-readable data catalogue that describes every data source available to the system,
So that the classifier and each agent's system prompt contain an accurate, complete description of what data exists, what it covers, and which agent should use it.

**Acceptance Criteria:**

**Given** all data sources in `data_extract/` and `data_extract/processed/` are identified,
**When** `api/config/data_catalogue.md` is written,
**Then** it documents each source with: file path, format, what it contains, date coverage or version, which agent(s) it feeds, and the canonical original-file citation name the answer should use
**And** it explicitly lists what is NOT available (e.g. live ERP data, action registers, cost actuals) so agents can give honest "data not available" responses rather than hallucinating
**And** the catalogue is loaded at startup and injected into the classifier's system prompt and each agent's system prompt
**And** the catalogue defines raw confidence and authority hierarchy rules used for source-of-truth decisions, corroboration, and ambiguity handling
**And** the catalogue is the authoritative reference for Story 5.0 (schedule schema) and Story 5.0b (financial model schema) — those stories extend it with field-level detail
**And** coverage at minimum:
  - `data_extract/processed/schedules.json` — parsed Primavera XER data (5 BUs + Phos3-Ph1 snapshots); feeds DELIVERY ENGINE
  - `data_extract/strategy/financial_model/` XLS — FY25–2040 financial model; feeds VALUE LENS
  - ChromaDB `neom_docs` collection at `data_extract/chroma_db/` (sourced from `rag_manifest.json`) — strategy PDFs; feeds RISK RADAR, GAP FINDER, ACTION DESK
  - `data_extract/investor_relations/` — earnings calls and annual reports indexed in ChromaDB; available to RAG agents

---

### Story 4.4: Primavera Source Provenance

As DELIVERY ENGINE,
I want every milestone and task in schedules.json to carry a `source_file` field,
So that I can cite the originating XER file in every response and satisfy FR24.

**Acceptance Criteria:**

**Given** `scripts/process_schedule_data.py` runs against the V18/V16 XER files,
**When** it writes `data_extract/processed/schedules.json`,
**Then** every milestone and task dict carries `"source_file": "<xer_basename>"` identifying its originating XER file
**And** every Phos3 snapshot milestone carries a `source_file` for its specific snapshot XER
**And** a top-level `"sources"` manifest lists current/baseline XER basename for each BU and each Phos3 snapshot
**And** schema version is bumped to `"2.1"`
**And** `api/config/data_catalogue.md` is updated with a one-line note about the `source_file` field

---

### Story 4.5: Workbook Full-Text Index

As the agent serving Ma'aden's executive dashboard,
I want `build_workbook_index.py` to extract all unique text from every sheet in the workbook,
So that I can locate any sheet by querying labels and section titles — not just the 10 consolidated sheets.

**Acceptance Criteria:**

**Given** `scripts/build_workbook_index.py` runs on the 125-sheet financial model,
**When** it writes `data_extract/processed/workbook_index.json`,
**Then** all 125 sheets are indexed (stub/indexed tier distinction removed)
**And** each sheet entry includes `"text_tokens"`: up to 300 unique non-empty strings scanned from the entire sheet (not just col A)
**And** key consolidated sheets (original whitelist) retain the `row_labels` field alongside `text_tokens`
**And** the JSON size limit is raised to 2 MB
**And** `describe_workbook()` surfaces top 5 text tokens for non-key sheets in its output

---

### Story 4.6: Excel Tool Modernisation

As VALUE LENS,
I want to call `preview_sheet` to see actual sheet structure and values before writing extraction code,
So that my `run_python` calls succeed on the first attempt — eliminating 3–5 retry rounds per financial question.

**Acceptance Criteria:**

**Given** Story 4.5 (full-text index) is complete,
**When** the agent handles a financial question,
**Then** `preview_sheet`, `preview_sheets`, and `list_sheets` are available as tools (re-exposed from Story 2.10)
**And** `describe_workbook` is a lightweight overview (BU aliases + sheet names + dims + top 5 tokens; no row-label dump)
**And** `run_python` output cap is raised from 4,000 to 10,000 chars
**And** the VALUE LENS system prompt in `agents.yaml` reflects the new flow: catalogue → preview_sheet → run_python

---

### Story 4.7: Agent Loop Reliability

As an engineer,
I want the agent loop to degrade gracefully as it approaches its call budget,
So that users always receive a partial answer rather than a silent timeout.

**Acceptance Criteria:**

**Given** a financial or schedule question is submitted,
**When** the agent loop runs,
**Then** `_MAX_ROUNDS` is 15 (reduced from 20)
**And** every tool result includes `_meta.calls_remaining` so the model is budget-aware throughout
**And** temporary pressure messages escalate across the remaining budget (soft, medium, hard) rather than appearing only in the final three rounds
**And** empty-content or max-round paths trigger one consolidation attempt using the evidence already gathered before `not_supported` is emitted
**And** user-facing runtime strings for pressure, consolidation, and fallback messaging come from `api/prompts/runtime/agent_runtime.md`
**And** typical financial questions complete in ≤ 5 tool rounds (not 15)

---

## Epic 5: Tool-Based Agents (DELIVERY ENGINE + VALUE LENS)

**Goal:** DELIVERY ENGINE and VALUE LENS are built to real analytical depth. Both agents use structured Python tool calls against parsed source data — the LLM never generates numerical values independently. DELIVERY ENGINE answers schedule questions using Primavera XER data. VALUE LENS answers financial questions using XLS-derived CSV data. Every response cites ≥2 source data points.

### Story 5.0: Schedule Data Schema

As a developer,
I want a field-level schema document for `data_extract/processed/schedules.json`,
So that the DELIVERY ENGINE agent and its tool implementations have a precise, LLM-injectable reference for what data exists, what each field means, and how to construct valid tool calls.

**Acceptance Criteria:**

**Given** `data_extract/processed/schedules.json` exists (produced by `scripts/process_schedule_data.py`),
**When** `api/config/schedule_schema.md` is written,
**Then** it documents the top-level structure: `schema_version`, `processed_at`, `bus` (keyed by BU: `phosphate`, `aluminum`, `gold`, `copper`, `ree`), and `detailed.phos3_ph1`
**And** for `bus[bu]` it documents each array/object: `milestones` (fields: `activity_id`, `name`, `project_id`, `project_name`, `planned_finish`, `baseline_finish`, `variance_days`, `rag_status`), `tasks` (adds `task_type`, `wbs_id`, `planned_start`), `dependencies` (`task_id`, `pred_task_id`, `pred_type`, `lag_hr_cnt`), `wbs` (keyed by `wbs_id`: `name`, `parent_wbs_id`, `proj_id`)
**And** for `detailed.phos3_ph1` it documents: `latest_snapshot` key, `change_summary` fields, and the `snapshots` dict (keyed `baseline_sep24` / `jan26` / `feb26`) — each snapshot has `data_date`, task counts, `overall_pct_complete`, `milestones` (adds `task_code`, `status_code`, `phys_complete_pct`, `current_finish`), and `progress_by_prefix`
**And** RAG status logic is documented: Green = variance ≤ 0 days, Amber = 1–30 days, Red = > 30 days, Unknown = no baseline date, New = milestone added after baseline
**And** `schedule_schema.md` is injected into the DELIVERY ENGINE system prompt at startup
**And** `api/config/xer_params.json` lists the demo-relevant project IDs and key milestone activity IDs per BU — this file is used by tool implementations to scope queries to meaningful subsets

---

### Story 5.1: XER Parser and DELIVERY ENGINE Agent

As a developer,
I want a Primavera XER parser that exposes schedule data as callable Python tools, and a DELIVERY ENGINE agent that uses those tools to answer schedule questions,
So that schedule answers are grounded in real XER data and the LLM cannot fabricate milestone dates or float values.

**Acceptance Criteria:**

**Given** a Primavera XER file exists in `data_extract/`,
**When** `api/services/xer_parser.py` runs,
**Then** it reads the XER file via `xerparser` and returns structured activity data: `activity_id`, `name`, `planned_start`, `planned_finish`, `baseline_finish`, `total_float_days`, `rag_status`, `successor_ids`
**And** on missing or malformed XER file: returns `{"error": "...", "code": "DATA_MISSING"}` — no exception propagates

**Given** the XER parser is functional,
**When** an agent calls a schedule tool,
**Then** two tools are registered in `api/services/tools/schedule_tools.py`:
  - `get_project_schedule(project_id: str)` → list of activities for the named project
  - `estimate_delay_impact(project_id: str, delay_days: int)` → list of impacted successor activities and their revised finish dates
**And** both tools are listed in the DELIVERY ENGINE agent's tool registry — no other agent has access to these tools

**Given** a schedule-domain question is routed to DELIVERY ENGINE,
**When** the agent responds,
**Then** the response is grounded exclusively in `get_project_schedule` or `estimate_delay_impact` output — the LLM generates no dates or float values independently (FR23)
**And** the response cites ≥2 specific data points: activity name + planned finish, float days, or delay delta (FR24)
**And** if the requested project is not in the XER file: "I don't have schedule data for [project] — please provide the XER extract and I can answer this question."
**And** `xer_parser.py` ≤120 lines; `schedule_tools.py` ≤80 lines

---

### Story 5.0b: Financial Model Schema

As a developer,
I want a field-level schema document for the XLS financial model in `data_extract/strategy/financial_model/`,
So that the VALUE LENS agent and its tool implementations have a precise, LLM-injectable reference for what sheets and metrics exist, what each row represents, and how to construct valid tool calls.

**Acceptance Criteria:**

**Given** `v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx` exists in `data_extract/strategy/financial_model/`,
**When** `api/config/financial_model_schema.md` is written,
**Then** it lists every sheet name in the workbook and a one-line description of what each contains
**And** for each data-bearing sheet it documents: the BU(s) covered, the metrics available (row labels), the year range (column span), the unit (SAR millions, USD millions, tonnes, etc.), and the row index or named range needed by `openpyxl` to extract each metric
**And** it identifies which sheets contain EBITDA, capex, revenue, leverage ratio, and production volume data for each BU — these are the minimum required for VALUE LENS demo scenarios
**And** any derived or calculated rows (e.g. growth rates, ratios) are flagged as derived so the agent does not cite them as primary source data
**And** `financial_model_schema.md` is injected into the VALUE LENS system prompt at startup
**And** `api/config/financial_params.json` records the confirmed sheet names and row indices required by `financial_model_parser.py` — this file is the sole place the parser reads structural parameters from (no hardcoded sheet names in code)

---

### Story 5.2: XLS Financial Model Parser and VALUE LENS Agent

As a developer,
I want an XLS financial model parser that preprocesses to CSV and exposes financial data as callable Python tools, and a VALUE LENS agent that uses those tools to answer financial questions,
So that financial answers are grounded in real model data and the LLM cannot fabricate EBITDA figures or capex values.

**Pre-development prerequisite (30 min, before coding starts):**
Open the XLS financial model in `data_extract/` and confirm: sheet names containing EBITDA rows, capex rows, and BU P&L data for 2025–2040. Record confirmed sheet names and row indices in `api/config/financial_params.json`.

**Acceptance Criteria:**

**Given** an XLS financial model file exists in `data_extract/`,
**When** `api/services/financial_model_parser.py` runs,
**Then** it reads the XLS via `openpyxl` with `data_only=True` using sheet names and row indices from `financial_params.json`
**And** it writes a normalized CSV to `data_extract/processed/financial_model.csv` with columns: `bu`, `metric`, `year`, `value_sar`
**And** on missing file or unreadable row: returns `{"error": "...", "code": "DATA_MISSING"}`

**Given** the financial model CSV is written,
**When** an agent calls a financial tool,
**Then** two tools are registered in `api/services/tools/financial_tools.py`:
  - `get_financial_summary(bu: str, metric: str, year_range: list[int])` → timeseries dict `{year: value_sar}`
  - `get_capex_plan(bu: str)` → capex by year for the specified BU
**And** both tools are listed in the VALUE LENS agent's tool registry — no other agent has access to these tools

**Given** a financial-domain question is routed to VALUE LENS,
**When** the agent responds,
**Then** the response is grounded exclusively in `get_financial_summary` or `get_capex_plan` output — the LLM generates no SAR values or percentages independently (FR25)
**And** the response cites ≥2 specific data points: metric name + value + year + BU (FR26)
**And** if the requested metric or BU is not in the CSV: "I don't have [metric] data for [BU] — please verify the financial model extract covers this scope."
**And** `financial_model_parser.py` ≤100 lines; `financial_tools.py` ≤80 lines

---

## Epic 6: RAG-Based Agents (RISK RADAR + GAP FINDER + ACTION DESK)

**Goal:** Three agents answer their question domains via ChromaDB-indexed strategy PDFs. All three share a common retrieval service. Quality is driven by prompt engineering and retrieval tuning, not real-time data tools. Every response cites source documents. No agent generates figures not present in retrieved content.

### Story 6.1: ChromaDB PDF Ingestion and Retrieval Service

As a developer,
I want strategy PDFs indexed into a local ChromaDB collection with a callable retrieval tool,
So that the three RAG agents can retrieve relevant context at query time without preprocessing at runtime.

**Acceptance Criteria:**

**Given** PDF files exist in `data_extract/`,
**When** `api/services/pdf_indexer.py` runs,
**Then** it reads each PDF via `pypdf`, chunks the text (500 tokens per chunk, 50-token overlap), embeds each chunk via `sentence-transformers` (`all-MiniLM-L6-v2` or equivalent local model), and upserts to a local ChromaDB collection named `neom_docs`
**And** each ChromaDB document includes metadata: `source_file`, `page_number`, `chunk_index`
**And** `POST /api/index` triggers re-indexing — callable manually; also runs automatically on startup if the collection is empty
**And** a retrieval tool `get_relevant_context(query: str, n_results: int = 5)` returns a list of `{text, source_file, page_number}` dicts
**And** `pdf_indexer.py` ≤120 lines; `retrieval_tool.py` ≤80 lines
**And** ChromaDB persists to a local directory — no cloud dependency (NFR10)

---

### Story 6.2: RISK RADAR, GAP FINDER, and ACTION DESK Agents

As an executive,
I want to ask risk, gap, and accountability questions and receive structurally coherent answers grounded in indexed strategy documents,
So that leadership questions in these domains are addressed without requiring live data tools.

**Acceptance Criteria:**

**Given** the ChromaDB collection is indexed and the three agent system prompts are defined,
**When** a question is routed to RISK RADAR, GAP FINDER, or ACTION DESK,
**Then** the agent invokes `get_relevant_context` to retrieve relevant chunks before composing a response

**For RISK RADAR** (risk exposure, timeline credibility, stress-testing):
**And** the response is scoped to the retrieved context — no risk quantification outside what the documents contain (FR27)
**And** the response cites the source document name and approximate section for every claim
**And** if retrieved context is sparse or dated: "My assessment is based on [document name, date]. For a more current view, provide [specific document type]." — the agent never fills the gap with fabricated risk data

**For GAP FINDER** (coverage gaps, board commitments, white spots):
**And** the response identifies only gaps evidenced in retrieved content — no gaps asserted without textual support (FR28)
**And** the response cites source documents and notes what tracking data would be needed to close each identified gap

**For ACTION DESK** (open actions, overdue commitments, accountability):
**And** the response attributes actions and owners only where retrieved content makes this explicit — no ownership inferred (FR29)
**And** the response cites source documents; if action register context is missing: "The documents I've indexed don't include an action register. If you provide one, I can track open items and overdue commitments."

**All three agents:**
**And** system prompts for each agent are defined in `api/services/agents/` as separate Python modules (≤80 lines each) — one file per agent
**And** all three agents share the same `get_relevant_context` retrieval tool; no agent has access to XER or financial tools

---

## Epic 7: Frontend Mockup Integration

**Goal:** A static MSE dashboard mockup — built independently of the agent layer — is wired into the main Next.js codebase. The mockup mirrors the MSE PowerPoint structure and serves as the visual centrepiece of the demo: it shows what the full platform would replace. No live data pipeline, no API calls.

### Story 7.1: Chat UX Iteration — Strategic Co-pilot Interface

As an executive,
I want the chat panel to feel like a real conversation with a strategic co-pilot,
So that the interaction is intuitive, legible, and clearly branded as an AI advisor rather than a what-if tool.

**Acceptance Criteria:**

**Given** the user is on any page with the top-bar chat trigger,
**When** the top bar is rendered,
**Then** the trigger label reads "Ask strategic co-pilot" (replacing any "what-if scenario" or similar wording) — no other top-bar layout or positioning changes

**Given** the user focuses the chat input in the top bar,
**When** they type a multi-line query (using Shift+Enter or natural line-wrapping),
**Then** the textarea grows vertically to accommodate the content (min 1 line, max ~6 lines before scrolling) — it does not overflow or clip the top bar

**Given** the user submits a query,
**When** the side panel opens (or is already open),
**Then** the submitted question appears as a right-aligned chat bubble (distinct background, user attribution style consistent with the design system)
**And** while the agent is responding, a loading indicator is visible in the agent message area

**Given** the agent has a response,
**When** the response is rendered,
**Then** it is displayed as a left-aligned agent message rendered in Markdown (headings, bullets, bold, and code blocks all supported)
**And** a "Strategic Co-pilot" label is shown above the agent message bubble

**Given** the conversation has at least one exchange,
**When** the side panel is open,
**Then** a new multi-line input field is present at the bottom of the panel — separate from the top-bar trigger — allowing the user to type and submit follow-up queries
**And** the conversation history (all prior bubbles) remains visible above the input, scrollable
**And** each new exchange appends to the thread in chronological order (oldest at top, newest at bottom)

**And** no backend changes are required — all conversation state is managed client-side in React component state
**And** the existing top-bar trigger continues to open/close the side panel as before

---

### Story 7.2: MSE Dashboard Data and Route

As a developer,
I want the MSE dashboard mockup wired into the Next.js routing and navigation,
So that users can navigate to the MSE dashboard from the sidebar without any setup beyond `pnpm dev`.

**Acceptance Criteria:**

**Given** the Next.js app is running,
**When** a user navigates to `/mse` or clicks "MSE Review" in the sidebar,
**Then** the route loads the MSE dashboard without a page reload (client-side navigation) (FR31)
**And** the MSE dashboard data is loaded from `public/data/mse-dashboard.json` — no API call, no network dependency (FR30)
**And** `mse-dashboard.json` contains realistic, plausible MSE content covering at minimum: KPI status table (4 BUs × 5 KPIs), Initiative Delivery Tracker (≥8 initiatives with RAG status), BU Performance Summary (narrative per BU), Risk Highlights (≥4 risks with owner and status)
**And** all content uses official Ma'aden project names (Phos-4, Phos-5, etc.) — no generic placeholders
**And** the sidebar "MSE Review" link is added to the persistent navigation and respects the existing design system styling

---

### Story 7.3: MSE Dashboard UI

As an executive,
I want to see the MSE dashboard in a layout that mirrors the Monthly Strategy Execution PowerPoint structure,
So that the platform's vision of replacing the manual MSE process is immediately legible during the demo.

**Acceptance Criteria:**

**Given** the user navigates to the MSE dashboard,
**When** the page renders,
**Then** four sections are visible, each corresponding to a section of the MSE PowerPoint:
  - **KPI Status Overview** — tabular view of all BUs × KPIs with RAG status indicators
  - **Initiative Delivery Tracker** — list/table of strategic initiatives with status, owner, and milestone
  - **BU Performance Summary** — narrative summary card per BU
  - **Risk Highlights** — risk register excerpt with risk description, owner, and RAG status
**And** the design uses the NEOM Industrial Mineral tokens — consistent with the existing KPI dashboard
**And** no API call is made at runtime — the page is entirely static from the JSON file
**And** initial page load is <3 seconds (NFR1)
**And** no horizontal scroll at standard desktop viewport widths

---

### Story 7.4: Live Streaming Pipeline Fix — Real-Time Agent Progress

As an executive,
I want to see real-time progress updates from the moment I submit a question,
So that I know the system is working and what step it is on — not a silent wait followed by a burst answer.

**Acceptance Criteria:**

**Given** the user submits a question,
**When** the request reaches the backend,
**Then** the InsightDrawer shows "Routing your question…" within ~1 second — before any LLM call completes

**Given** routing and validation complete,
**When** the agent begins its tool-calling loop,
**Then** each tool call emits a progress message visible in the InsightDrawer (e.g. "Exploring the financial workbook structure…")

**Given** the user submits a follow-up question from the in-panel input,
**When** the agent responds,
**Then** the same real-time progress messages appear — identical behaviour to the top-bar query bar

**And** no SSE event types are modified — only where blocking work occurs changes (inside the stream generator)
**And** all `StreamingResponse` calls include `X-Accel-Buffering: no` to prevent GCP Cloud Run load balancer buffering

**Note:** Workstream A+B (backend query router + frontend FollowUpInput). Root causes: (1) `route_query()` and `validate_query()` block before `StreamingResponse` is created; (2) `FollowUpInput` missing `thinking` event handler; (3) GCP buffering without `X-Accel-Buffering: no`.

---

## Epic 8: Deployment Setup

**Goal:** The platform is deployable beyond the local development environment. The FastAPI backend runs in a Docker container on GCP Cloud Run. The Next.js frontend deploys to Vercel. Local and deployed configurations are symmetric — same env vars, same behaviour.

### Story 8.1: Docker Container and GCP Cloud Run Configuration

As a developer,
I want the FastAPI backend containerised and configured for GCP Cloud Run deployment,
So that the backend can be demoed from a stable URL without requiring a local Python environment.

**Acceptance Criteria:**

**Given** `Dockerfile` exists in the repository root (or `api/`),
**When** `docker build` runs,
**Then** it produces a working image running Python 3.11 with all `requirements.txt` dependencies installed
**And** `CMD` is `uvicorn api.main:app --host 0.0.0.0 --port 8080`
**And** `GET /api/health` returns `{"status": "ok", "version": "<git-sha>"}` — callable as a Cloud Run health check
**And** a `cloudbuild.yaml` (or equivalent) defines the build-and-deploy steps for Cloud Run
**And** `api/config/env_vars.md` documents every environment variable required at runtime (LLM_MODEL, LLM_API_KEY, CHROMA_PERSIST_PATH, etc.) with a one-line description of each
**And** the Dockerfile does not bake in any secrets — all secrets are injected at runtime via Cloud Run env vars

---

### Story 8.2: End-to-End Local and Deployed Smoke Test

As a developer,
I want a documented smoke test that confirms the full system works both locally and on the deployed URL,
So that the team can verify demo-readiness in under 10 minutes.

**Acceptance Criteria:**

**Given** the local `.env.local` file is populated,
**When** `pnpm dev` and `uvicorn api.main:app --reload` are both running,
**Then** the following smoke test passes:
  - KPI dashboard loads and scorecards render without errors
  - MSE dashboard loads with all four sections visible
  - Submitting "What is the current schedule status for Phos-4?" routes to DELIVERY ENGINE and returns a response citing XER data
  - Submitting "What is the EBITDA outlook for Phosphate in 2027?" routes to VALUE LENS and returns a response citing financial model data
  - Submitting "What are the main execution risks?" routes to RISK RADAR and returns a response citing a strategy document
  - Submitting "What is the weather in Riyadh?" (or any out-of-scope question) returns a scope explanation with no agent badge and no numerical data
**And** the same smoke test passes on the deployed Vercel + Cloud Run URL (substituting localhost references with deployed URLs)
**And** the smoke test steps are documented in `docs/smoke-test.md` — executable by any team member in <10 minutes

---
