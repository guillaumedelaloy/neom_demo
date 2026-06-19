# Story 1.3: Stakeholder Alignment Checkpoint

**Story ID:** 1.3
**Story Key:** 1-3-stakeholder-alignment-checkpoint
**Epic:** Epic 1 — Foundation & Stakeholder Validation
**Status:** ready-for-dev
**Date Created:** 2026-04-09

---

## User Story

As a BCG engagement partner,
I want to walk stakeholders through the deployed Day 1 UI and capture their feedback on direction,
so that any misalignment on use case, layout, or information hierarchy is corrected before Days 2–5 are spent building the wrong thing.

---

## Context and Business Value

**This is a process gate, not a software deliverable.** No code is written in this story.

Story 1.2 produced a deployed Vercel URL with NEOM branding, 10-module sidebar, 4-BU KPI scorecards, a Recharts trend chart, and placeholder query/what-if bars. That artifact now needs a human eye to validate before Epic 2 data-wiring begins.

The cost of misalignment: correcting layout or terminology choices costs hours here; correcting them after Epic 2 (real data wired, chart components tuned) costs days. This checkpoint is the single architectural moment where course-correction is cheap.

**Completion definition:** feedback captured in writing, go/no-go decision made explicit, any layout/terminology changes scoped and either incorporated or deferred with rationale recorded.

---

## Acceptance Criteria

**AC1:** Story 1.2 is deployed and accessible via the stable Vercel URL — no local setup required for stakeholders.

**AC2:** The following five questions are explicitly put to stakeholders and answers recorded in writing:
1. Does the BU scorecard layout communicate performance status clearly at a glance?
2. Is the module sidebar the right navigation model, or should entry be BU-first?
3. Does the positioning of the query bar feel natural for an executive user?
4. Are the KPI labels and terminology correct (e.g. "Leverage ratio", "EBITDA contribution")?
5. Is there any capability visible that should not be in the POC, or any missing that should be?

**AC3:** Feedback is captured as written notes or a recording — not just verbal. A Slack thread, document, or email chain is acceptable.

**AC4:** Any layout or terminology changes identified are explicitly scoped: either incorporated before Epic 2 begins (if ≤2 hours of work) or deferred with a recorded rationale.

**AC5:** The team does not begin Epic 2 story implementation until this checkpoint is complete or explicitly waived by the BCG partner.

---

## Tasks / Subtasks

- [ ] T1: Share deployed URL with stakeholders (AC: 1)
  - [ ] T1.1: Confirm Vercel production URL is live and publicly accessible via Vercel Access (no 404, no login friction for intended audience)
  - [ ] T1.2: Send URL to stakeholders with a 1-sentence context ("This is the Day 1 UI shell — please review before we wire real data on Day 2")

- [ ] T2: Conduct checkpoint session (AC: 2, 3)
  - [ ] T2.1: Walk stakeholders through the 5 questions from AC2 — async written review OR synchronous walkthrough, either is valid
  - [ ] T2.2: Record answers in writing (Slack message, shared doc, or email reply — any written medium)

- [ ] T3: Triage feedback and scope changes (AC: 4)
  - [ ] T3.1: For each piece of feedback, classify: incorporate now (≤2h), defer to Epic 2+, or accept as-is
  - [ ] T3.2: If any change is incorporated, create a focused code change on the `epic/1-foundation-validation` branch — do NOT start a new story branch for sub-2h tweaks
  - [ ] T3.3: Record deferred items with rationale (Slack or doc is fine — no formal tracking required for a 5-day POC)

- [ ] T4: Make and record go/no-go decision (AC: 5)
  - [ ] T4.1: Confirm explicitly with BCG partner: "Proceed to Epic 2?" — yes, no, or conditional
  - [ ] T4.2: Record the decision in this story's Dev Agent Record section before marking done

---

## Dev Notes

### What the Stakeholder Will See (Story 1.2 Output)

The deployed UI at the Vercel URL includes:
- Dark navy background, NEOM green accent — Benchmark Intelligence aesthetic
- 10-module sidebar (Modules 1–4 active, Modules 5–10 show "Data pending")
- BU sub-navigation: Phosphate, Aluminum, Gold, Copper under Module 1
- KPI scorecards: 4 BUs × 4 KPIs with actuals, plan, delta %, status badges (green/amber/red)
- Hardcoded Recharts line chart: Phosphate production volume trend (Q1 2025 – Q2 2026)
- Disabled query bar ("AI Query Bar") — positioned below the KPI grid
- Disabled what-if input ("Scenario analysis — coming Day 3") — positioned at bottom

Phosphate capex is intentionally set at 127% of plan (2.3B vs 1.8B SAR) — this is the Tier 3 deviation trigger for Story 5.1. Confirm with stakeholders that this value looks realistic, not erroneously alarming.

### Common Feedback Patterns and How to Handle Them

| Feedback type | Handling |
|---|---|
| "The KPI labels are wrong" | T3.2 — update `lib/data.ts` KPI names only; ≤30 min |
| "Need different BU order" | T3.2 — reorder `BU_KPI_DATA` array; ≤15 min |
| "Sidebar feels cluttered with 10 modules" | T3.3 — defer; restructuring sidebar affects routing, worth waiting for Epic 2 data to inform final layout |
| "What-If should be a tab, not a sidebar module" | T3.3 — defer; layout restructure in Epic 4 when feature is real |
| "Add a 5th BU" | T3.3 — defer with explicit rationale: PRD scopes 4 BUs; adding one now means adding fake data before real data exists |
| "Colors look off" | T3.2 — update `.dark` CSS vars in `app/globals.css`; NEOM green is `oklch(0.52 0.13 155)` |
| "Remove placeholder modules 5–10 entirely" | T3.3 — defer with rationale: placeholder modules demonstrate POC scope; removing them before showing their purpose risks scope confusion |

### No Code Boundary

This story does NOT include:
- Any Epic 2 story work (data parsing, KPI API, Recharts real data)
- New component creation or routing changes beyond sub-2h feedback tweaks
- Any LLM or backend wiring

If feedback reveals a structural change >2h, open a new story after this checkpoint completes — do not absorb scope into this gate.

### Branch and Merge Context

- Active branch: `epic/1-foundation-validation`
- Story 1.1 and 1.2 are already merged into this epic branch
- Any sub-2h tweaks from T3.2 commit directly to `epic/1-foundation-validation`
- Epic branch → `main` PR is cut after this story is marked done (end of Epic 1)

### Project Structure Notes

No new files. Only potential modifications from feedback triage:
- `lib/data.ts` — KPI label/value corrections
- `app/globals.css` — color adjustments
- `components/layout/Sidebar.tsx` — module label corrections

### References

- [Source: epics.md#Story 1.3] — full AC specification and process gate definition
- [Source: epics.md#Epic 1] — business objective: validate direction before Days 2–5 investment
- [Source: sprint-status.yaml] — git branching strategy: epic/1 integration branch, story branch model
- [Source: 1-2-full-ui-shell-with-hardcoded-kpi-data-for-stakeholder-review.md#Dev Notes] — full list of files built and deployed; KPI data reference values

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

N/A — no code implementation in this story.

### Completion Notes List

### File List

### Change Log

- 2026-04-09: Story created from epics.md analysis and Story 1.2 learnings. Status → ready-for-dev.
