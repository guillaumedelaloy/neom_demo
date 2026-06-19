---
title: "Product Brief: NEOM Strategy Execution AI"
status: "updated"
created: "2026-04-09"
updated: "2026-04-15 (rev 3)"
scope: "3-day-poc"
inputs:
  - "_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-13.md"
  - "agent_structure_input/NEOM_Strategy_Execution_AI_Agent framework & questions long list.pdf"
---

# Product Brief: NEOM Strategy Execution AI

## Executive Summary

NEOM's Monthly Strategy Execution (MSE) review is produced manually — a multi-slide PowerPoint assembled from disparate data sources by the strategy team. It takes days to prepare, it can only answer the questions that were anticipated in advance, and the moment it is printed, it is already out of date.

This brief scopes a proof of concept that replaces that process with two components: a **static dashboard** that visually replicates the MSE PowerPoint output, and an **AI chat interface** that lets the leadership team ask any strategic question — about capital project delivery, financial performance, risk exposure, execution gaps, or accountability — and get a structured, data-grounded answer in seconds.

The chat interface is backed by an orchestrator that classifies each question and routes it to one of five specialist agents: DELIVERY ENGINE, VALUE LENS, RISK RADAR, GAP FINDER, and ACTION DESK. The user never selects an agent or navigates menus. They ask a question in natural language. The platform figures out which agent — or combination of agents — should answer it.

**POC constraint:** 3 days, 3 people, runs fully locally. The scope is narrow by design. Two agents answer questions using real data tools (XER schedule files, XLS financial model). Three answer via retrieved context from indexed strategy documents when that context materially improves the answer. The dashboard is a static mock — no live data pipeline. The platform runs locally with a single command per service.

**BCG's contribution is the thinking, not just the code.** The five-agent framework reflects a considered view of the full question space a CEO and strategy team face during MSE — capital delivery, financial value, risk, coverage gaps, and action follow-through. The platform is an expression of that view, implemented as software.

**Agents are honest about what they don't know.** Every agent has built-in guardrails: when the data needed to answer a question is absent or insufficient, the agent says so explicitly — naming what is missing and what it would enable. Agents never hallucinate when data is thin. This honest degradation is a designed trust feature, not a limitation.

---

## The Problem

**The MSE review process is a manual production exercise.** The strategy team spends days compiling a PowerPoint deck from multiple data sources. The resulting document answers the questions the preparer anticipated — not the ones that arise in the room.

**Questions that are not in the deck go unanswered in the meeting.** "What happens to 2030 EBITDA if Phos 3 is delayed by 6 months?" or "Which initiatives have the highest risk of missing their near-term milestones?" require analyst time to answer. If they arise mid-discussion, the answer is deferred.

**Coverage is uneven.** The current review focuses heavily on capital projects. Commercial excellence, operational performance, technology adoption, people agenda, and exploration get inconsistent treatment — not because they are less important, but because the manual process cannot scale to cover everything with equal rigor.

**Insights do not convert to accountability.** Even when the review surfaces a risk or gap, there is no live register linking insight to action, owner, and due date. Follow-through relies on memory and email.

**The current state is a governance problem, not a data problem.** The underlying data exists — in Primavera XER files, the FY25–2040 financial model, and strategy documents. What is missing is a platform that can read it, reason over it, and surface the right answer to the right question in real time.

---

## Platform Vision

The NEOM Strategy Execution AI is a natural-language platform that answers the full breadth of questions leadership and the strategy team ask across the complete scope of strategy execution.

The platform covers **six strategic agendas**:

- **Capital projects** — major growth projects across Phosphate, Aluminum, and BMNM; the largest component by value
- **Commercial & product excellence** — new product development, new market penetration, product mix optimization (DAP→NPK, commodity→value-added aluminum), margin improvement
- **Operational excellence & productivity** — productivity, reliability, yield improvement, and unit cost reduction across all business units
- **Technology & digitalization** — TechOps programmes, digital twins, APC deployments, data platforms; deployment pace and adoption tracking
- **People agenda** — hiring plan execution, talent development, capability-building, succession planning
- **Exploration** — discovery-to-development pipeline, license portfolio management, partnership strategy, resource addition profile

The platform handles **12 question types**: Status, Query, Consistency, Gaps, What If, Root Cause, Risk, Prioritize, Optimize, Action, Scenarios, and So What. Every agent applies across every strategic agenda. The platform treats a people development programme and a major capital project with the same analytical rigor.

The interface is **a single natural-language window.** Simple factual lookups — "What is total capex planned this year?" — are handled instantly by a direct retrieval layer. Complex analytical questions route to the relevant combination of agents. The user never selects an agent or navigates dashboards.

---

## The Five Agents

**RISK RADAR — Risk & Resilience Agent**
*"What could derail our value delivery across all our strategic agendas — and how exposed are we?"*
Identifies, prioritizes, and stress-tests threats across the full portfolio — from execution readiness and timeline credibility to technical, operational, talent, and macro risks.

**DELIVERY ENGINE — Execution Velocity Agent**
*"Are we moving fast enough across all our strategic agendas — and where can we go faster?"*
Assesses whether the portfolio is moving fast enough and surfaces specific levers to accelerate or resequence initiatives — including schedule compression, technology deployment pace, hiring pace, and modular delivery opportunities. Backed by parsed Primavera XER schedule data.

**VALUE LENS — Financial Impact Agent**
*"Are we creating the value we planned across all our strategic agendas — and are we investing in the right places?"*
Tracks whether the portfolio is generating expected value, stress-tests financial assumptions, optimizes capital allocation, models commercial and product portfolio scenarios. Backed by XLS-derived financial model data.

**GAP FINDER — White Spot & Decision Intelligence Agent**
*"What are we not seeing, not tracking, and not deciding fast enough — across all six strategic agendas?"*
Surfaces what is not being tracked, not being asked, and not being decided — including gaps against board commitments, planning quality, people and talent gaps, technology readiness and adoption gaps, exploration pipeline gaps, and strategic coverage gaps.

**ACTION DESK — Action & Accountability Agent**
*"Who owns what, by when — and are they delivering across all our strategic agendas?"*
Tracks open actions, overdue commitments, stalled decisions, and accountability gaps. Provides meeting-to-meeting continuity by tracking whether prior action points have been closed.

**Orchestrator + "So What" Synthesis Layer**
Classifies incoming questions and routes to the appropriate agent or combination of agents. For "So What" questions — *"What are the most critical changes we need to make?"* or *"What questions will the board ask?"* — the orchestrator synthesizes outputs from all agents into an opinionated executive narrative, identifying the most critical changes needed and framing strategic implications for leadership action.

---

## Agent Guardrails: Honest About What They Don't Know

Every agent has a built-in self-assessment layer. Before returning an answer, the agent evaluates whether the data it has access to is sufficient to answer the question reliably.

**If data is sufficient:** The agent answers directly, citing the original raw source file — which XER file and milestone, which financial model sheet and row, which retrieved document and page/slide — so the answer is auditable, not a black box.

**If data is incomplete or thin:** The agent does not hallucinate. It answers what it can, flags what is uncertain, and tells the user specifically what data is missing and what that data would enable. For example:

- *DELIVERY ENGINE:* "I can tell you Phos 3 is 14 days behind on the civil foundation workpackage, but I don't have the procurement milestone data to calculate the full critical path impact. If you provide the procurement schedule extract, I can give you the delay-to-completion figure."
- *RISK RADAR:* "The strategy documents I've indexed don't include the latest risk register update. My risk assessment is based on the September review pack. If you index the current register, the answer may change."
- *VALUE LENS:* "The financial model CSV I have runs to 2030. I cannot calculate the 2040 EBITDA scenario without the full planning horizon data."

**Why this matters:** The leadership team using this platform during a live MSE review needs to know when to trust an answer and when to push back. An agent that hedges silently is less useful than one that says clearly: "I'm missing X — here's what you'd need to give me a better answer." This behavior also surfaces data gaps that the strategy team can address over time, progressively improving answer quality.

**Implementation note:** Guardrail behavior is primarily a prompt engineering concern for all five agents. Tool-based agents (DELIVERY ENGINE, VALUE LENS) have deterministic data availability checks — they know exactly which fields and files are present. RAG agents (RISK RADAR, GAP FINDER, ACTION DESK) assess retrieval quality and flag when retrieved context is sparse or dated. If the tool loop exhausts its search budget or returns empty content, the system makes one consolidation pass using the evidence already gathered before falling back to a true out-of-scope response.

---

## Answer Contract

The product's trust model is part of the product, not just an implementation detail.

- **Concise by default.** Simple factual questions should usually resolve in 1-3 sentences, not a formatted report.
- **Original-file citation only.** User-facing answers cite raw source files such as IMP XER basenames, the financial model workbook, or named PDF/PPT source documents — never tool names or processed artifacts like `schedules.json`.
- **Confidence is textual, not a widget.** When an answer uses retrieved data or explicit analysis, it may include concise data-confidence and analysis-confidence labels. This is distinct from the removed traffic-light UI feature.
- **Corroboration is explicit.** If a claim plausibly exists in multiple sources, the system should cross-check at least two available sources when feasible, mention corroboration when they agree, and surface ambiguity when they do not.
- **Source of truth is named on conflict.** When sources disagree, the answer states which source was prioritized and why, following the Data Catalogue authority hierarchy.
- **Strategy docs are conditional context.** Strategy and execution documents are used when they materially improve framing, rationale, or qualitative risk context; they do not override higher-authority schedule or financial sources.

---

## BCG's Thinking Is the Product

The five-agent framework is not a generic AI design. It reflects BCG's view of the complete question space that governs strategy execution — and the specific domains where insight without a home gets lost.

Most organizations monitor capital projects. Fewer apply the same rigor to commercial coverage, technology adoption, people planning, and exploration — the agendas where gaps accumulate quietly and become expensive surprises. The GAP FINDER agent exists precisely because those gaps will not show up unless someone explicitly looks for them.

The ACTION DESK exists because insights without accountability are inert. The platform closes the loop: every risk surfaced by RISK RADAR, every schedule question answered by DELIVERY ENGINE, every gap identified by GAP FINDER should translate into an owned action with a named person and a date. The ACTION DESK tracks whether that happens.

This architecture — five named agents with distinct scopes, a synthesis layer that produces board-ready narrative, a single interface that requires no navigation — is BCG's intellectual contribution. The code makes it real.

---

## POC Scope: What We Are Building

The POC demonstrates the platform with a narrow but credible implementation. The constraint is 3 days, 3 people, fully local.

### Component 1: Static Dashboard Mock

A visual replica of the MSE PowerPoint structure, integrated into the Next.js application. Displays KPI status, initiative tracking, and BU performance using hardcoded or JSON-driven data. No live data pipeline.

**Purpose:** Demonstrates the dashboard vision and allows the full application to be shown end-to-end. Frees capacity for agent implementation depth.

**Out of scope for the dashboard:** Live data pipeline, dynamic KPI updates, real-time data feeds.

### Component 2: AI Chat Interface

A single natural-language chat window. The orchestrator classifies the question and routes to the appropriate agent context. The agent identity is visible in the response ("Answered by DELIVERY ENGINE"). No agent selection menu — the platform decides.

**Two agents built to full tool depth:**

| Agent | Question domain | Data source | Implementation |
|---|---|---|---|
| DELIVERY ENGINE | Schedule velocity, milestone status, critical path, delay impact | Primavera XER files (parsed) | Structured tool calls — XER parser → Python functions |
| VALUE LENS | Financial performance, capex tracking, EBITDA impact, what-if scenarios | XLS financial model → CSV preprocessing | Structured tool calls — CSV tools |

**Three agents built via RAG + structured prompts:**

| Agent | Question domain | Data source | Implementation |
|---|---|---|---|
| RISK RADAR | Risk exposure, timeline credibility, portfolio stress testing | Strategy PDFs | ChromaDB-indexed retrieval + structured system prompt |
| GAP FINDER | Coverage gaps, board commitments, white spots | Strategy PDFs | ChromaDB-indexed retrieval + structured system prompt |
| ACTION DESK | Open actions, accountability, stalled decisions | Strategy PDFs | ChromaDB-indexed retrieval + structured system prompt |

**RAG agent quality is driven by prompt engineering and retrieval tuning**, not data tool depth. The answers will be structurally coherent and contextually grounded; they will not compute live figures the way DELIVERY ENGINE and VALUE LENS do. They should also stay concise by default, cite original source documents, and use strategy-document context only when it adds material value.

### Hosting & Runtime

- **Frontend:** Next.js, deployed to Vercel, runs locally via `pnpm dev`
- **Backend:** FastAPI (Python), runs locally via `uvicorn api.main:app`, deployable to GCP Cloud Run
- **Vector store:** ChromaDB (local)
- **Default chat model:** LiteLLM with `LLM_MODEL=anthropic/claude-opus-4-6` by default; provider remains env-configurable
- **Full local startup:** Two commands. No cloud configuration required to demo.

---

## What Is In Scope

| Capability | Status |
|---|---|
| Static dashboard mock — MSE PPT visual structure | In scope |
| Orchestrator classifies and routes to correct agent context | In scope |
| DELIVERY ENGINE — answers schedule questions using XER-derived tools | In scope |
| VALUE LENS — answers financial questions using XLS-derived CSV tools | In scope |
| RISK RADAR, GAP FINDER, ACTION DESK — RAG + structured prompts | In scope |
| Agent identity visible in chat response | In scope |
| Local startup: `pnpm dev` + `uvicorn` | In scope |
| GCP Cloud Run deployment configuration | In scope (Epic 8, last) |
| Agent guardrails — data gap disclosure and source citation in responses | In scope (all agents) |
| Concise response contract, original-file citations, confidence/ambiguity handling | In scope (all agents) |

## What Is Out of Scope

| Capability | Reason |
|---|---|
| Live data pipeline to the dashboard | Not needed for POC; static mock demonstrates the vision |
| User-facing agent selection menu | Orchestrator handles routing invisibly |
| All agents built to full tool depth | Only DELIVERY ENGINE and VALUE LENS have real data tools; RAG agents use retrieval |
| Confidence traffic light / answer tier indicators | Removed from new framing |
| iPad-optimized layout | Not a priority target for this POC |
| Voice / TTS | Out of scope |
| Action recommendation engine | Covered by ACTION DESK agent responses |
| PIF generation | Out of scope |

---

## Who This Serves

**CEO and senior leadership** — Primary users during the MSE review session. Ask natural-language questions, get structured answers grounded in real data. Challenge schedule assumptions, model financial scenarios, surface gaps and risks in real time.

**Strategy execution team** — Monthly review prep drops from days to hours. Dashboard replaces manual PowerPoint assembly. Chat interface handles ad hoc questions that would otherwise require analyst time.

**BCG engagement team** — The platform is a tangible demonstration of BCG's strategy execution intelligence framework. The agent architecture, question coverage, and "So What" synthesis layer are BCG's IP, implemented in software.

---

## Where We Will Be When the POC Is Done

At the end of 3 days, the team will have:

- A running application with a static dashboard that replicates the MSE PowerPoint structure
- An AI chat interface where the orchestrator correctly routes at least 3 distinct question types to the right agent context
- DELIVERY ENGINE answering a schedule question ("What happens to EBITDA if Phos 3 is delayed?") using parsed XER data
- VALUE LENS answering a financial question ("What is the total capex planned this year?") using XLS-derived data
- RISK RADAR, GAP FINDER, and ACTION DESK responding coherently to their respective question domains without hallucinating numbers
- The full system starting locally with two commands
- A Vercel frontend deployment and a GCP Cloud Run backend configuration

This is a credible, demonstrable POC that shows the platform concept end-to-end — not a complete product, but a working foundation with two agents built to real analytical depth and three demonstrating structural coherence.

The full platform vision — live data pipeline, all five agents at full tool depth, complete question coverage across all six strategic agendas, real-time action tracking — is the engagement this POC is designed to support.
