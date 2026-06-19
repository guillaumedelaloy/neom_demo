# Sprint Change Proposal — 2026-04-13

**Prepared by:** Scrum Master (Correct Course workflow)
**Date:** 2026-04-13
**Triggered by:** Stakeholder session, April 13
**Change scope:** MAJOR
**Handoff:** PM / Architect sign-off required before story rewrite begins

---

## Section 1: Issue Summary

The product vision has shifted from a personal CEO cockpit ("Jarvis for Bob") to a platform that automates and enhances the **Monthly Strategy Execution (MSE) review process** — currently produced manually as a multi-slide PowerPoint deck.

The new scope has two components:

1. **Dashboard** — Static mock UI that visually replicates the MSE PowerPoint output (KPI status, initiative tracking, BU performance). No live data pipeline required for POC. Built separately as a frontend mockup and integrated into the main codebase.
2. **Chat** — AI chat interface backed by a question classifier/orchestrator that routes to one of five specialist agent contexts (RISK RADAR, DELIVERY ENGINE, VALUE LENS, GAP FINDER, ACTION DESK). Agent framing is primarily UI/frontend presentation. Backend classifies the question and applies the right context + tools. Implementation is pragmatic — tools that read XER files, XLS/CSV, and ChromaDB-indexed PDFs. No complex multi-agent orchestration.

**Hard constraints:** 3 days remaining, 3 people, must run fully locally.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Original Title | Verdict |
|------|---------------|---------|
| 1 | Foundation | ✅ Complete — untouched |
| 2 | Data Layer | Preserve as-is |
| 3 | Shell AI Query Bar | Preserve as-is (no agent-specific logic) |
| old 4 | What-If Scenario Engine | Removed — data tools absorbed into new Epic 5 |
| old 5 | Action Rec + PIF | Removed — covered by agent responses |
| old 6 | CEO Cockpit Agent Layer | Removed — replaced by new Epics 4–6 |
| old 7 | TTS + iPad | Removed |

### New Epic Structure

| # | Epic | Owner focus | Parallelisable? |
|---|------|-------------|-----------------|
| 2 | Data Layer | Person 3 | Yes |
| 3 | Shell AI Query Bar | Person 2 | Yes (builds on merged work) |
| **4** | Connect Agent to Data Layer | Person 2 | After Epic 3 shell |
| **5** | Tool-Based Agents (DELIVERY ENGINE + VALUE LENS) | Person 3 | Parallel with Epic 6 |
| **6** | RAG-Based Agents (RISK RADAR + GAP FINDER + ACTION DESK) | Person 2 | Parallel with Epic 5 |
| **7** | Frontend Mockup Integration | Person 1 | Fully independent |
| **8** | Deployment Setup (GCP + local) | Whoever unblocks first | After core epics stable |

### Artifact Conflicts

**Product Brief:** Full reframe required. Remove Jarvis/Bob framing, T-shaped delivery, confidence traffic light, Agent A/B, TTS, iPad. Replace with MSE automation platform, two-component model, 5 agent contexts, new data stack, GCP + local hosting.

**PRD:** Major rewrite of Executive Summary, Success Criteria, Product Scope, User Journeys, and FRs. See Section 4 for specifics.

**Architecture:** Backend shifts from Vercel Python serverless → GCP Cloud Run / local FastAPI. Add ChromaDB. Remove Vercel Python serverless pattern.

**Epics:** Old Epics 4–7 removed. New Epics 4–8 added as above.

---

## Section 3: Recommended Approach

**Hybrid of Option 1 (Direct Adjustment) + Option 3 (MVP Review).**

- Preserve Epics 2 and 3 as-is — they are the most stable, already-built foundation
- Rewrite brief + PRD with MSE framing
- Replace old Epics 4–7 with new Epics 4–8
- Agent depth: DELIVERY ENGINE + VALUE LENS built to real tool depth; RISK RADAR + GAP FINDER + ACTION DESK as structured RAG + prompt
- Dashboard is a static mock — removes live data pipeline complexity and frees capacity for agent work
- GCP backend treated as local-first, deployable to Cloud Run — do not block on cloud config

**Effort:** High. **Risk:** Medium (Epics 2–3 reuse reduces risk materially). **Timeline:** Tight but achievable with parallel workstreams.

---

## Section 4: Detailed Change Proposals

### 4.1 Product Brief

**OLD:** Jarvis CEO Cockpit for Bob. T-shaped POC. Agents A & B at Green confidence. Confidence traffic light on every response. iPad-optimized. TTS voice reading. Primary user: Bob (CEO).

**NEW:**
- **Title/vision:** NEOM Strategy Execution AI — automate, challenge, and improve the Monthly Strategy Execution process
- **Primary purpose:** Replace manual MSE PowerPoint with an automated dashboard + AI chat interface
- **Two components:** Static dashboard mock (replicates MSE PPT) + AI chat (agent-classified, tool-backed)
- **Users:** Leadership + strategy team
- **Agent framing:** UI presents 5 named agents; backend classifies and routes; user sees one chat window
- **Data:** Primavera XER, XLS financial model (→ CSV), PDFs via ChromaDB
- **Hosting:** Vercel frontend + GCP backend, runs locally
- **Scope:** 3 days / 3 people

**Remove:** Bob persona, T-shaped language, confidence traffic light, TTS, iPad, Amber/Red mock response framing.

---

### 4.2 PRD

**Executive Summary:** Rewrite — MSE automation framing, two-component model, 3-day/3-person constraint.

**Success Criteria — replace with:**
- Dashboard mock visually replicates MSE PPT structure
- Orchestrator correctly routes questions to the right agent context
- ≥2 agents (DELIVERY ENGINE + VALUE LENS) answer grounded questions using real data tools
- RAG agents (RISK RADAR + GAP FINDER + ACTION DESK) respond coherently to their question domain
- System runs fully locally end-to-end

**Product Scope — remove:**
- Agent A / Agent B as named standalone deliverables
- T-shaped delivery / confidence traffic light language
- TTS / voice (FR41, FR42)
- iPad as primary optimization target (FR38, NFR15)
- Explicit agent menu with user selection (FR34, FR35)
- Action recommendation + PIF generation (FR27–FR33)
- Amber/Red mock response tier

**Product Scope — add:**
- Dashboard is static mock — mirrors MSE PPT structure, no live data pipeline
- Orchestrator/classifier routes questions to appropriate agent context
- 5 agent contexts: DELIVERY ENGINE, VALUE LENS, RISK RADAR, GAP FINDER, ACTION DESK
- Data layer: ChromaDB (PDFs), XER parser, XLS → CSV preprocessing
- Backend: GCP Cloud Run / local FastAPI
- Must run fully locally with single command per service

**FRs to remove:** FR20–FR42 (what-if engine, action rec, PIF, agent menu, iPad, TTS)

**FRs to add:**
- Orchestrator classifies question type and routes to appropriate agent context
- DELIVERY ENGINE answers schedule/velocity questions using XER-derived tools
- VALUE LENS answers financial questions using XLS-derived CSV tools
- RISK RADAR, GAP FINDER, ACTION DESK answer questions via ChromaDB RAG + structured prompts
- Dashboard renders static MSE-equivalent content from hardcoded/JSON data
- System runs locally: `pnpm dev` (frontend) + `uvicorn` (backend)

**User Journeys:** Replace Bob/Nora/Fatima with journeys anchored to MSE process — preparing for monthly review, asking a schedule question mid-meeting, querying financial impact of a delay.

**Architecture:** Backend → GCP Cloud Run / local FastAPI. Add ChromaDB. Remove Vercel Python serverless.

**NFRs:** Remove NFR15 (iPad primary). Keep performance targets. Add: must run locally with single command.

---

### 4.3 Epics

**Remove:** Epics 4 (What-If), 5 (Action Rec/PIF), 6 (CEO Cockpit Agent Layer), 7 (TTS/iPad)

**Add:**

**Epic 4 — Connect Agent to Data Layer**
Wire the Epic 3 query bar to a classifier that selects the appropriate agent context and invokes the relevant data tools. Agent identity is surfaced in the response UI (e.g. "Answered by DELIVERY ENGINE"). This epic is the integration bridge between the shell (Epic 3) and the full agent implementations (Epics 5–6).

**Epic 5 — Tool-Based Agents (DELIVERY ENGINE + VALUE LENS)**
DELIVERY ENGINE: schedule/velocity questions answered using parsed XER data. VALUE LENS: financial questions answered using XLS-derived CSV tools. Both agents have access to structured tool calls — not free-form RAG. These are the two deepest implementations.

**Epic 6 — RAG-Based Agents (RISK RADAR + GAP FINDER + ACTION DESK)**
All three answered via ChromaDB-indexed PDFs + structured system prompts scoped to each agent's domain. Thinner implementation — quality driven by prompt engineering and retrieval tuning.

**Epic 7 — Frontend Mockup Integration**
Static MSE dashboard mockup (built separately) wired into the main Next.js codebase. Navigation shell, routing, and design system alignment. Fully independent of Epics 4–6.

**Epic 8 — Deployment Setup**
GCP Cloud Run configuration, Docker container for FastAPI backend, environment variable management (local `.env` parity with GCP secrets), Vercel frontend deployment, end-to-end smoke test on deployed URL.

---

## Section 5: Implementation Handoff

**Scope classification: MAJOR**

| Role | Action |
|------|--------|
| PM / BCG lead | Approve this proposal |
| Tech lead | Rewrite architecture doc; define agent interface contract (how classifier invokes agent context + tools) |
| Person 1 | Begin Epic 7 (frontend mockup) independently — no backend dependency |
| Person 2 | Epic 3 → Epic 4 → Epic 6 sequence |
| Person 3 | Epic 2 → Epic 5 → Epic 8 sequence |

**Success criteria for implementation:**
- Dashboard mock renders MSE-equivalent view
- Orchestrator routes ≥3 distinct question types to correct agent context
- DELIVERY ENGINE answers a schedule question using real XER data
- VALUE LENS answers a financial question using real XLS-derived data
- RAG agents respond coherently without hallucinating numbers
- `pnpm dev` + `uvicorn api.main:app` starts the full system locally

---

## Section 6: Next Steps

1. PM approves this proposal
2. Tech lead updates `architecture.md` with new backend/data stack
3. Rewrite `product-brief-neom_demo.md` — use this proposal as source of truth
4. Rewrite `prd.md` — use Section 4.2 above as the change spec
5. Replace old Epics 4–7 with new Epics 4–8 in `epics.md`
6. Begin story writing for new Epics 4–8 in a fresh context window (`bmad-create-epics-and-stories`)
